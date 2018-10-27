"use strict"

const imgDL = require('image-downloader');
const path = require('path');
const fse = require('fs-extra');
const dateFormat = require('dateformat');
const logger = require('./logger.js');
const com = require('commander');
const fetch = require("node-fetch");
const cheerio = require('cheerio');

process.env.COMPUTERNAME = process.env.NODE_ENV || process.env.USER;
const config = require('config');

//================ helper methods ================
//returns today's date, but flips over at 1:00 EST the next day
//format:
//	0 yyyymmdd	20181015
//	1 mmm dd	Oct 25
const getHockeyDate = function(daysAgo = 0, format = 0) {
	const fstring = format == 0 ? "yyyymmdd" : "mmm dd";
	let now = new Date();
	now.setHours(now.getHours() - 13)
	now.setDate(now.getDate() - daysAgo)
	return dateFormat(now, fstring);
};

//================ constants ================
const diskRoot = config.get("diskRoot");
const logDir = config.get("logger.dir");
const yearDefault = config.get("year").toString();
const webRoot = "http://hockeyviz.com/fixedImg";
const gamesURL = "http://hockeyviz.com/games/" + yearDefault;

const allTeams=["CAR","CBJ","N.J","NYR","NYI","PHI","PIT","WSH","BOS","BUF","DET","FLA","MTL","OTT","T.B","TOR","ANA","ARI","CGY","EDM","L.A","S.J","VAN","VGK","CHI","COL","DAL","MIN","NSH","STL","WPG"];
const teamTypes=["shotLocOff","shotLocDef","shotLocOffPP","shotLocDefPK","hexesPK","hexesEVd","hexesEVf","hexesPP","overview","teamWowy","scoringNetwork","forwardIcetime","defenderIcetime","minors","forwardCombos","defenderCombos","skaterGoaltending","fLines","dPairs","usage","forwardUsage","defenderUsage","goalieUsage","forwardScoreDeployment","defenderScoreDeployment","zoneDeployment","forwardSkaterContext","defenderSkaterContext"];

//================ web functions ================

const downloadIMG = async function(options, redownload = false) {
  if (fse.existsSync(options.dest) && !redownload) {
  	logger.debug("skip redownload: " + options.dest) 
  	return
  }
  try {
    const { filename, image } = await imgDL.image(options)
    logger.debug("downloaded: " + filename) // => /path/to/dest/image.jpg 
  } catch (e) {
    logger.warn(e)
  }
};

//gets the teams that played a game on the specified day in 'mmm dd' format. 
//Defaults to most recent hockey day with publically available data
const getTeamsForDay = async function (dateString) {
  dateString = dateString || getHockeyDate(1,1);
  try {
    const response = await fetch(gamesURL);
    const html = await response.text()
    const $ = cheerio.load(html)
    //const list = $(".table>tbody>tr").first().find('a').text().replace(/\n/g,' ').replace(/at|\t|/g,'').trim().split('  ')
    const list = $(".table>tbody>tr").filter(function(i){return $(this).text().includes(dateString.replace(' ',String.fromCharCode(160)))}).find('a').text().replace(/\n/g,' ').replace(/at|\t|/g,'').trim().split('  ')
    logger.debug("Retrieved recently played teams " + list)
    return list
  } catch (error) {
    logger.warn("Error retrieving recently played teams " + error);
  }
};

//================ disk functions ================
//returnslist of dates for which images matching the dir passed (stips file if extension present)
//e.g ["20181024", "20181026", "20181027"]
const getDiskDates = async function(dir) {
	const check = (path.extname(dir) == "" ? dir : path.dirname(dir));
	const files = await fse.readdir(check)
	return files.map(x => path.basename(x, ".png"))
};
//TODO
const getMostRecentDiskDate = async function(dir) {
	const dates = await getDiskDates(dir)
	const idates = dates.map(x => parseInt(x))
	return Math.max(...idates)
}

//================ functions ================

//can be run once to create the directory structure for images
const initTeamImageDirs = async function(rootDir = diskRoot, year = yearDefault) {
	let dirs = [logDir, rootDir, path.join(rootDir, year), path.join(rootDir, year, "team")];
	for (const team in allTeams) {
		dirs.push(path.join(rootDir, year, "team", allTeams[team]));
		for (const type in teamTypes) {
			dirs.push(path.join(rootDir, year, "team", allTeams[team], teamTypes[type]))
	}}
	for (const dir in dirs) {
		await fse.ensureDir(dirs[dir]);
	}
}

const collectTeamItem = function(team, item, year = yearDefault) {
	const date = getHockeyDate(1);
	return [webRoot, item, year, team, date, diskRoot];
};
const collectTeamItems = function(team, year = yearDefault) {
	return teamTypes.map(x => collectTeamItem(team, x, year));
};
const collectAllTeamItems = function(teams = allTeams, year = yearDefault) {
	let opts = [];
	teams.forEach(function(team, i){
		opts = opts.concat(collectTeamItems(team, year));
	});
	return opts;
};
const optionsFromTeamItems = function(teamItems){
	return teamItems.map(x => { return {url: [x[0],x[1],x[2],x[3]].join("/"), dest: path.join(x[5],x[2],"team",x[3],x[1],x[4])+".png"}});
};
//call this without arguments to get options for all possible images for today
const dlOptionsForTeams = function(teams = allTeams, year = yearDefault) {
	return optionsFromTeamItems(collectAllTeamItems(teams, year));
}

//================ entrypoints and exports ================
//command line options (node index.js -h)
com
	.option('-i, --init', 'Initialize directory tree for images.')
	.option('-f, --fullDownload', 'Download all images for all teams')
	.option('-d, --download', 'Download all images for yesterday\'s updates')
	.option('-r, --showRecentTeams', 'Prints teams that played most recently')
	.parse(process.argv);

const init = async function() {
	try {
		await initTeamImageDirs();
		logger.info("Image directories initialized.")
	} catch (e) {
		logger.error("Error during dir init:" + e)
	}
}

const fullDownload = async function() {
	dlOptionsForTeams().forEach(function(listItem, index){
		downloadIMG(listItem);
	});
}

//main download function - downloads teams that played yesterday
const download = async function() {
	const recentTeams = await getTeamsForDay(1)
	dlOptionsForTeams(recentTeams).forEach(function(listItem, index){
		downloadIMG(listItem);
	});
}

if (com.init) {
	init();
}
if (com.download) {
	download();
}
else if (com.fullDownload) {
	fullDownload();
}

if (com.showRecentTeams){
	getTeamsForDay().
	then(x => console.log(x.toString()))
}

module.exports.init = init;
module.exports.fullDownload = fullDownload;
module.exports.download = download;

module.exports.getTeamsForDay = getTeamsForDay;