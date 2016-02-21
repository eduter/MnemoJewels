/**
 * @typedef {{value: string, frequency: string}} Translation
 */

/**
 * @typedef {Object.<string, Array.<Translation>>} GoogleTranslations
 */

/**
 * Function to batch translate words using Google Translate.
 * To use it, paste it in the browser's console, while on Google Translate.
 * The result is output to the console as JSON.
 *
 * @param {string} sourceLang
 * @param {string} destLang
 * @param {Array.<string>} words
 */
function batchTranslate(sourceLang, destLang, words){
    var resultBox = document.getElementById('result_box');
    var alternativeTranslationsBox = document.getElementById('gt-lc');
    var DELAY = 30;

    /**
     * @type {GoogleTranslations}
     */
    var results = {};

    function parseResult() {
        var translations = [{
            value: resultBox.textContent,
            frequency: 'main'
        }];
        if (alternativeTranslationsBox.style.display != 'none') {
            var nodes = document.querySelectorAll('.gt-baf-word-clickable');
            for (var i = 0; i < nodes.length; i++) {
                var markerContainer = nodes[i].parentElement.parentElement.querySelector('.gt-baf-marker-container');
                if (markerContainer) {
                    var title = markerContainer.title;
                    translations.push({
                        value: nodes[i].textContent,
                        frequency: title.split(' ')[0].toLowerCase()
                    });
                }
            }
        }
        return translations;
    }

    function searchWord(word, doneCallback) {
        var hash = getHash(word);

        location.hash = hash;
        var interval = setInterval(function(){
            if (resultBox.textContent != '' && resultBox.textContent != 'Translating...') {
                try {
                    results[word] = parseResult();
                    localStorage.setItem(hash, JSON.stringify(results[word]));
                } catch (e) {
                    console.error(e);
                }
                clearInterval(interval);
                doneCallback();
            }
        }, DELAY);
    }

    function getHash(word) {
        return sourceLang + '/' + destLang + '/' + word;
    }

    function clearResult(doneCallback) {
        location.hash = sourceLang + '/' + destLang + '/';
        var interval = setInterval(function(){
            if (resultBox.innerHTML == '') {
                clearInterval(interval);
                doneCallback();
            }
        }, DELAY);
    }

    function searchNextWord() {
        if (words.length > 0) {
            var word = words.shift();
            var cachedResult = localStorage.getItem(getHash(word));

            if (cachedResult === null) {
                clearResult(function(){
                    searchWord(word, searchNextWord);
                });
            } else {
                results[word] = JSON.parse(cachedResult);
                searchNextWord();
            }
        } else {
            //console.dir(results);
            console.log(JSON.stringify(results));
        }
    }

    searchNextWord();
}
