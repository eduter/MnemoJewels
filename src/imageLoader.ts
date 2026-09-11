function loadImages(imagesToLoad: string[]): Promise<void[]> {
  const promises = imagesToLoad.map(url => loadImage(url).catch(() => {
    console.error(`failed to load ${url}`);
  }));
  return Promise.all(promises);
}

function loadImage(url: string): Promise<void> {
  console.log(`loading "${url}"...`);
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });
}

export default {
  loadImages,
};
