/* global expect */
'use strict';

const utils = require('../utils');

describe('each directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                list : [
                    {label : 'one'},
                    {label : 'two'}
                ]
            }
        });

        emv.filter = (item) => {
            return item.label !== 'one';
        };

        emv.sort = (item1, item2) => {
            return item1.label < item2.label ? -1 : 1;
        };

        return utils.loadPage('each.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check each directive', () => {
        expect($('li').length).to.equal(2);
        expect($('li').get(0).innerText).to.equal('one');
        expect($('li').get(1).innerText).to.equal('two');

        emv.list.push({
            label : 'three'
        });

        expect($('li').length).to.equal(3);
        expect($('li').get(0).innerText).to.equal('one');
        expect($('li').get(1).innerText).to.equal('two');
        expect($('li').get(2).innerText).to.equal('three');

        emv.list.splice(0, 1);
        expect($('li').length).to.equal(2);
        expect($('li').get(0).innerText).to.equal('two');
        expect($('li').get(1).innerText).to.equal('three');
    });

    it('check each directive with filter, sort, order and item', () => {
        emv.list.push({
            label : 'three'
        });

        emv.list.push({
            label : 'four'
        });

        emv.list.push({
            label : 'five'
        });

        expect($('div').length).to.equal(4);
        expect($('span').get(0).innerText).to.equal('two');
        expect($('span').get(1).innerText).to.equal('three');
        expect($('span').get(2).innerText).to.equal('four');
        expect($('span').get(3).innerText).to.equal('five');
    });

    it('check each directive with sort function', () => {
        emv.list.push({
            label : 'three'
        });

        emv.list.push({
            label : 'four'
        });

        emv.list.push({
            label : 'five'
        });

        expect($('button').length).to.equal(5);
        expect($('button').get(0).innerText).to.equal('five');
        expect($('button').get(1).innerText).to.equal('four');
        expect($('button').get(2).innerText).to.equal('one');
        expect($('button').get(3).innerText).to.equal('three');
        expect($('button').get(4).innerText).to.equal('two');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});