var parse = require('mout/queryString/parse');
var keys = require('mout/object/keys');
var query = exports.query = parse(window.location.href.replace('#', '?'));

exports.useStats = false;
exports.isMobile = /(iPad|iPhone|Android)/i.test(navigator.userAgent);

var amountMap = {
    '4k': [64, 64, 0.29],
    '8k': [128, 64, 0.42],
    '16k': [128, 128, 0.48],
    '32k': [256, 128, 0.55],
    '65k': [256, 256, 0.6],
    '131k': [512, 256, 0.85],
    '252k': [512, 512, 1.2],
    '524k': [1024, 512, 1.4],
    '1m': [1024, 1024, 1.6],
    '2m': [2048, 1024, 2],
    '4m': [2048, 2048, 2.5]
};

exports.amountList = keys(amountMap);
var preference=query.amount;
if(!preference){try{preference=localStorage.getItem('shadowform-particles');}catch(e){}}
exports.autoParticles=!amountMap[preference];query.amount=exports.autoParticles?'auto':preference;
var amountInfo=amountMap[exports.autoParticles?'16k':preference];
exports.activeParticles=amountInfo[0]*amountInfo[1];
// Keep the original 65K atlas available so lower presets can switch instantly.
var capacity=exports.activeParticles>65536?amountInfo:amountMap['65k'];
exports.simulatorTextureWidth=capacity[0];exports.simulatorTextureHeight=capacity[1];
exports.renderScale=1;exports.vision=0;exports.particleAmount=function(key){return amountMap[key]?amountMap[key][0]*amountMap[key][1]:16384;};

exports.useTriangleParticles = true;
exports.followMouse = true;

exports.speed = 1;
exports.dieSpeed = 0.015;
exports.radius = amountInfo[2];
exports.curlSize = 0.02;
exports.attraction = 1;
exports.shadowDarkness = 0.45;

exports.bgColor = '#ffffff';
exports.color1 = '#000000';
exports.color2 = '#000000';

exports.fxaa = false;
var motionBlurQualityMap = exports.motionBlurQualityMap = {
    best: 1,
    high: 0.5,
    medium: 1 / 3,
    low: 0.25
};
exports.motionBlurQualityList = keys(motionBlurQualityMap);
query.motionBlurQuality = motionBlurQualityMap[query.motionBlurQuality] ? query.motionBlurQuality : 'medium';
exports.motionBlur = true;
exports.motionBlurPause = false;
exports.bloom = true;
