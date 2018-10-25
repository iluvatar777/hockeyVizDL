"use strict"

const imgDL = require('image-downloader');
const path = require('path');
const fs = require('fs');
const config = require('config');
const dateFormat = require('dateformat');
const logger = require('./logger.js');
const com = require('commander');
const fetch = require("node-fetch");
const cheerio = require('cheerio');

//================ helper methods ================
//creates dir if it does not already exist
const touchDir = function(dir) {
	!fs.existsSync(dir) && fs.mkdirSync(dir);
};
//returns today's date, but flips over at 1:00 EST the next day
const getHockeyDate = function() {
	let now = new Date();
	now.setHours(now.getHours() - 13)
	return dateFormat(now, "yyyymmdd");
};

//================ constants ================
const diskRoot = config.get("diskRoot");
const yearDefault = config.get("year").toString();
const webRoot = "http://hockeyviz.com/fixedImg";
const gamesURL = "http://hockeyviz.com/games/" + yearDefault;

const allTeams=["CAR","CBJ","N.J","NYR","NYI","PHI","PIT","WSH","BOS","BUF","DET","FLA","MTL","OTT","T.B","TOR","ANA","ARI","CGY","EDM","L.A","S.J","VAN","VGK","CHI","COL","DAL","MIN","NSH","STL","WPG"];
const teamTypes=["shotLocOff","shotLocDef","shotLocOffPP","shotLocDefPK","hexesPK","hexesEVd","hexesEVf","hexesPP","overview","teamWowy","scoringNetwork","forwardIcetime","defenderIcetime","minors","forwardCombos","defenderCombos","skaterGoaltending","fLines","dPairs","usage","forwardUsage","defenderUsage","goalieUsage","forwardScoreDeployment","defenderScoreDeployment","zoneDeployment","forwardSkaterContext","defenderSkaterContext"];

//================ web functions ================

async function downloadIMG(options, redownload = false) {
  if (fs.existsSync(options.dest) && !redownload) {
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

//gets the teams that played a game in the last updated day on hockyviz
//could be generalized by replacing first() with selecting by the date string (e.g. "Oct 24")
async function getMostRecentTeams() {
  try {
    const response = await fetch(gamesURL);
    const html = await response.text()
    const $ = cheerio.load(html)
    const list = $(".table>tbody>tr").first().find('a').text().replace(/\n/g,' ').replace(/at|\t|/g,'').trim().split('  ')
    logger.debug("Retrieved recently played teams " + list)
    return list
  } catch (error) {
    logger.warn("Error retrieving recently played teams " + error);
  }
};
 
//================ functions ================

//can be run once to create the directory structure for images
const initTeamImageDirs = function(rootDir = diskRoot, year = yearDefault) {
	let dirs = [rootDir, path.join(rootDir, year), path.join(rootDir, year, "team")];
	for (const team in teams) {
		dirs.push(path.join(rootDir, year, "team", teams[team]));
		for (const type in teamTypes) {
			dirs.push(path.join(rootDir, year, "team", teams[team], teamTypes[type]))
	}}
	for (const dir in dirs) {touchDir(dirs[dir]);}
}

const collectTeamItems = function(team, year = yearDefault) {
	const date = getHockeyDate();
	return teamTypes.map(x => [webRoot, x, year, team, date, diskRoot]);
};
const collectAllTeamItems = function(teams = allTeams, year = yearDefault) {
	let opts = [];
	teams.forEach(function(team, i){
		opts = opts.concat(collectTeamItems(team, year));
	});
	return opts;
};
const dlOptionsFromTeamItems = function(teamItems){
	return teamItems.map(x => { return {url: [x[0],x[1],x[2],x[3]].join("/"), dest: path.join(x[5],x[2],"team",x[3],x[1],x[4])+".png"}});
};
//call this without arguments to get options for all possible images for today
const dlOptionsForTeams = function(teams = allTeams, year = yearDefault) {
	return dlOptionsFromTeamItems(collectAllTeamItems(teams, year));
}
//================ entrypoints and exports ================
com
	.option('-i, --init', 'Initialize directory tree for images.')
	.option('-f, --fullDownload', 'download all images for all teams')
	.option('-d, --download', 'download all images for yesterday\'s updates')
	.parse(process.argv);

const init = function() {
	try {
		initTeamImageDirs();
		logger.info("Image directories initialized.")
	} catch (e) {
		logger.error("Error during directory initialization.")
	}
}

const fullDownload = function() {
	dlOptionsForTeams().forEach(function(listItem, index){
		downloadIMG(listItem);
	});
}

//main download function - downloads teams that played yesterday
const download = async function() {
	const recentTeams = await getMostRecentTeams()
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


module.exports.init = init;
module.exports.fullDownload = fullDownload;
module.exports.download = download;