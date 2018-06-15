/* global expect */
'use strict';

const utils = require('../utils');

describe('class directive', () => {
    const emv = new EMV({
        data : {
            class     : 'my-class',
            class3    : false,
            class4    : true,
            id        : 2,
            condition : true
        }
    });

    it('Test scalar class', () => {
        return utils.loadPage('class.html')

        .then(($) => {
            emv.$apply();

            expect($('#one-class')).to.have.class('class1');
            expect($('#one-class')).to.have.class('my-class');

            emv.class = 'your-class';
            expect($('#one-class')).to.not.have.class('my-class');
            expect($('#one-class')).to.have.class('your-class');

            emv.class = '';
            expect($('#one-class').attr('class')).to.equal('class1');
        });
    });

    it('Test object class', () => {
        return utils.loadPage('class.html')

        .then(($) => {
            emv.$apply();

            expect($('#many-classes')).to.have.class('class2');
            expect($('#many-classes')).to.have.class('class4');
            expect($('#many-classes')).to.not.have.class('class3');


            emv.class3 = true;
            expect($('#many-classes')).to.have.class('class4');
            expect($('#many-classes')).to.have.class('class3');
        });
    });


    it('Test a complex class string', () => {
        return utils.loadPage('class.html')

        .then(($) => {
            emv.$apply();

            expect($('#complex-classes')).to.have.class('static-class-2');
            expect($('#complex-classes')).to.have.class('conditional');

            emv.id = 3;
            expect($('#complex-classes')).to.have.class('static-class-3');
            expect($('#complex-classes')).to.not.have.class('static-class-2');

            emv.condition = false;
            expect($('#complex-classes')).to.not.have.class('conditional');
        });
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});
