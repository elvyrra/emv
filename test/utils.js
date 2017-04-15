'use strict';

const fs = require('fs');
const path = require('path');
const jQuery = require('cheerio');
const jsdom = require('jsdom');

module.exports = {
    loadPage : (filename) => {
        return new Promise((resolve, reject) => {
            try {
                const html = fs.readFileSync(path.join(__dirname, 'html', filename), 'utf8');

                jsdom.env(html, ['http://code.jquery.com/jquery.js'], (err, window) => {
                    if(err) {
                        reject(err);

                        return;
                    }

                    global.document = window.document;
                    global.window = window;

                    resolve(window.$);
                });
            }
            catch(err) {
                reject(err);

                return;
            }
        });
    }
};
