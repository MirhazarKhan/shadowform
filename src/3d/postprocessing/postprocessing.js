var effectComposer = require('./effectComposer');
var fxaa = require('./fxaa/fxaa');
var bloom = require('./bloom/bloom');
var motionBlur = require('./motionBlur/motionBlur');
var fboHelper = require('../fboHelper');

var undef;

exports.init = init;
exports.resize = resize;
exports.render = render;
exports.visualizeTarget = undef;

var _renderer;
var _scene;
var _camera;

function init(renderer, scene, camera) {

    _renderer = renderer;
    _scene = scene;
    _camera = camera;

    effectComposer.init(renderer, scene, camera);

    // for less power machine, pass true
    // fxaa.init(true);

    fxaa.init();
    effectComposer.queue.push(fxaa);

    // This game uses soft particles and depth atmosphere. Do not initialize
    // inactive motion-blur and bloom pipelines or their resize allocations.

}

function resize(width, height) {
    effectComposer.resize(width, height);
}


function render(dt) {

    effectComposer.renderQueue(dt);

    if(exports.visualizeTarget) {
        fboHelper.copy(exports.visualizeTarget);
    }

}
