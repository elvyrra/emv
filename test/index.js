/* global require */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiCheerio = require('chai-cheerio');
const EMV = require('../lib/emv');
const HTMLElement = require('html-element').Element;

String.prototype.padStart = function(length, cars) {
    var result = this;
    while(result.length < length) {
        const add = cars.substr(0, length - result.length);
        result = add + result;
    }

    return result;
};

global.HTMLElement = HTMLElement;
global.EMV = EMV;

chai.use(chaiAsPromised);
chai.use(chaiCheerio);
chai.should();

global.expect = chai.expect;

describe('EMV', () => {
    require('./tests/model');

    describe('Directives', () => {
        require('./tests/directive-show');
        require('./tests/directive-class');
        require('./tests/directive-style');
        require('./tests/directive-attr');
        require('./tests/directive-disabled');
        require('./tests/directive-value');
        require('./tests/directive-input');
        require('./tests/directive-focus');
        require('./tests/directive-click');
        require('./tests/directive-on');
        require('./tests/directive-options');
        require('./tests/directive-text');
        require('./tests/directive-html');
        require('./tests/directive-submit');
        require('./tests/directive-each');
        require('./tests/directive-if');
        require('./tests/directive-unless');
        require('./tests/directive-with');
        require('./tests/directive-template');
    });

    describe('Transformations', () => {
        require('./tests/transform-json');
        require('./tests/transform-lower');
        require('./tests/transform-number');
        require('./tests/transform-ucfirst');
        require('./tests/transform-ucwords');
        require('./tests/transform-upper');
        require('./tests/transform-chain');
    });

    describe('utils', () => {
        require('./tests/utils');
    });
});