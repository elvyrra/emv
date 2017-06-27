/* global expect */
'use strict';

const utils = require('../utils');

describe('value directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                text : 'Hello',
                checkbox : false,
                radio : 0,
                select : 1,
                textarea : '',
                other : '',
                editable : '',
                number : 12.5,
                date : '1987-05-31'
            }
        });

        return utils.loadPage('value.html')

        .then((jquery) => {
            $ = jquery;
            $('#editable').get(0).contentEditable = 'true';

            emv.$apply();

        });
    });

    it('bind text input', () => {
        $('#text-value').val('Hi man').trigger('change');

        expect(emv.text).to.equal('Hi man');
    });

    it('update text input', () => {
        emv.text = 'Youyou';

        expect($('#text-value').val()).to.equal(emv.text);
    });

    it('bind number input', () => {
        $('#number').val('21.5').trigger('change');

        expect(emv.number).to.equal(21.5);
    });

    it('update number input', () => {
        emv.number = 53.2;

        expect($('#number').val()).to.equal('53.20');
    });

    it('bind date input', () => {
        $('#date').val('2015-05-31').trigger('change');

        expect(emv.date.constructor.name).to.equal('Date');
        expect(emv.date.getFullYear()).to.equal(2015);
        expect(emv.date.getMonth()).to.equal(4);
        expect(emv.date.getDate()).to.equal(31);
    });

    it('update date input', () => {
        emv.date = '2017-06-30';

        expect($('#date').val()).to.equal(emv.date);
    });


    it('bind checkbox input', () => {
        $('#checkbox-value').get(0).checked = true;
        $('#checkbox-value').trigger('change');

        expect(emv.checkbox).to.equal(true);
    });

    it('update checkbox input', () => {
        emv.checkbox = true;

        expect($('#checkbox-value').is(':checked')).to.equal(true);
    });

    it('bind radio input', () => {
        $('input[name="radio"][value="1"]').attr('checked', true).trigger('change');

        expect(emv.radio).to.equal('1');
    });

    it('update radio input', () => {
        emv.radio = 3;

        expect($('input[name="radio"]:checked').val()).to.equal('3');
    });

    it('bind select box', () => {
        $('#select-value').val('2').trigger('change');

        expect(emv.select).to.equal('2');
    });

    it('update select box', () => {
        emv.select = 2;

        expect($('#select-value').val()).to.equal('2');
    });

    it('bind textarea', () => {
        $('#textarea-value').val('Hello').trigger('change');

        expect(emv.textarea).to.equal('Hello');
    });

    it('update textarea', () => {
        emv.textarea = 'Hello';

        expect($('#textarea-value').val()).to.equal('Hello');
    });

    it('update contenteditable div element', () => {
        emv.editable = 'Hello';

        expect($('#editable').get(0).innerHTML).to.equal('Hello');
    });

    it('bind contenteditable div element', () => {
        $('#editable').get(0).innerHTML = 'coucou';
        $('#editable').get(0).onblur();

        expect(emv.editable).to.equal('coucou');
    });

    it('bind other element', () => {
        $('#other-value').val('Hello').trigger('change');

        expect(emv.other).to.equal('');
    });

    it('update other element', () => {
        emv.other = 'Hello';

        expect($('#other-value').get(0).value).to.equal('Hello');
    });


    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});

describe('Value directive - syntaw error', () => {
    it('should throw an error', () => {
        const emv = new EMV({
            text : 'Hello'
        });

        return utils.loadPage('value-error.html')

        .then(($) => {
            expect(emv.$apply).to.throw(Error);
        });

    });
})