/* global expect */
'use strict';

const utils = require('../utils');

it('uid', () => {
    let x = EMV.utils.uid(),
        y = EMV.utils.uid();

    expect(x).to.not.equal(y);
});