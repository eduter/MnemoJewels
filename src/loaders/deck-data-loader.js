/**
 * Loader for deck metadata.
 */
module.exports = function(source) {
    this.cacheable && this.cacheable();
    var value = typeof source === "string" ? JSON.parse(source) : source;
    value = {
        uid: value.uid,
        displayName: value.displayName,
        version: value.version
    };
    this.value = [value];
    return "module.exports = " + JSON.stringify(value, undefined, "\t") + ";";
};
