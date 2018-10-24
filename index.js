"use strict"

const download = require('image-downloader');
const path = require('path');
const fs = require('fs');
var dateFormat = require('dateformat');

const touchDir = function(dir) {
	!fs.existsSync(dir) && fs.mkdirSync(dir);
};
//returns today's date, but flips over at 1:00 EST
const getHockeyDate = function() {
	let now = new Date();
	now.setHours(now.getHours() - 13)
	return dateFormat(now, "yyyymmdd");
};

const webRoot = "http://hockeyviz.com/fixedImg";
const diskRoot = "/Users/mgeisman/Documents/Projects/hockyviz/images";
const yearDefault = "1819";

const teams=["CAR","CBJ","N.J","NYR","NYI","PHI","PIT","WSH","BOS","BUF","DET","FLA","MTL","OTT","T.B","TOR","ANA","ARI","CGY","EDM","L.A","S.J","VAN","VGK","CHI","COL","DAL","MIN","NSH","STL","WPG"];
const teamTypes=["shotLocOff","shotLocDef","shotLocOffPP","shotLocDefPK","hexesPK","hexesEVd","hexesEVf","hexesPP","overview","teamWowy","scoringNetwork","forwardIcetime","defenderIcetime","minors","forwardCombos","defenderCombos","skaterGoaltending","fLines","dPairs","usage","forwardUsage","defenderUsage","goalieUsage","forwardScoreDeployment","defenderScoreDeployment","zoneDeployment","forwardSkaterContext","defenderSkaterContext"];

//can be run once to create the directory structure for images
const setUpTeamImageDirs = function(rootDir = diskRoot, year = yearDefault) {
	let dirs = [rootDir, path.join(rootDir, year), path.join(rootDir, year, "team")];
	for (const team in teams) {
		dirs.push(path.join(rootDir, year, "team", teams[team]));
		for (const type in teamTypes) {
			dirs.push(path.join(rootDir, year, "team", teams[team], teamTypes[type]))
		}
	}
	for (const dir in dirs) {
		touchDir(dirs[dir]);
	}
}



const collectTeamItems = function(team, year = yearDefault) {
	const date = getHockeyDate();
	return teamTypes.map(x => [webRoot, x, year, team, date, diskRoot]);
};
const dlOptionsFromTeamItems = function(teamItems){
	return teamItems.map(x => { return {url: [x[0],x[1],x[2],x[3]].join("/"), dest: path.join(x[5],x[2],x[1],x[3],x[4])+".png"}});
};

async function downloadIMG(options) {
  try {
    const { filename, image } = await download.image(options)
    console.log(filename) // => /path/to/dest/image.jpg 
  } catch (e) {
    console.error(e)
  }
}
 
//downloadIMG(EXoptions)
//const all = getAllURLs(["PIT","BOS"]);
console.log(collectTeamItems("PIT"))
console.log(dlOptionsFromTeamItems(collectTeamItems("PIT")))