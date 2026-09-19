
/**
 * Pre-loads a list of images.
 *
 * @param {string[]} imagesToLoad - a list of URLs of images
 * @returns {Promise} - a promise which fulfills when all images finish loading (or fail to load)
 */
function loadImages(imagesToLoad) {
    let promises = imagesToLoad.map(url => loadImage(url).catch(() => console.error(`failed to load ${url}`)));
    return Promise.all(promises);
}

/**
 * Returns a promise which fulfills when the specified image finishes loading.
 * @param {string} url
 * @returns {Promise}
 */
function loadImage(url) {
    console.log(`loading "${url}"...`);
    return new Promise(function (resolve, reject) {
        let image = new Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
    });
}

export default {
    loadImages: loadImages
}
