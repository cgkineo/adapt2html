var _ = require("underscore");
var async = require("async");
var exceptions = require("./exceptions.json");
var fs = require("fs");
var json2html = require("node-json2html");
var mu = require("mu2");
var path = require("path");

var htmlTitle;
var htmlBody;
var transform = { tag: "div", class: "element" };

function main() {
	console.log("Running adapt2html...");

	fs.readdir(".", function (err, files) {
		if (err) return console.log(err.toString());

		async.each(files, processFile, function() { console.log("Finished."); });
	});
}

function processFile(file, done) {
	if (path.extname(file) !== ".json") return done();

	if (file === "exceptions.json") {
		exceptions = require(path.join(process.cwd(), "exceptions.json"));
		console.log("Found custom exceptions.json.");
		return done();
	}

	fs.readFile(file, function (err, output) {
		if (err) return console.log(err.toString());

		htmlTitle = path.basename(file, ".json");
		htmlBody = "";
		output = JSON.parse(output);

		if (output.constructor !== Array) convertToHTML(output);
		else for (var i = 0, j = output.length; i < j; i++) {
			convertToHTML(output[i]);
		}

		writeHTML(done);
	});
}

function convertToHTML(element) {
	var borderTitle = element._component ? "${_id} ${_component} ${_type}" : "${_id} ${_type}";
	var displayTitle = element.displayTitle ? "${displayTitle}" : "&lt;empty&gt;";

	transform.children = [
		{
			tag: "h2",
			class: "border-title",
			html: borderTitle
		},
		{
			tag: "span",
			class: "attr",
			html: "displayTitle"
		},
		{
			tag: "h3",
			class: "display-title",
			html: displayTitle
		}
	];

	setUpTransform(null, element);
	htmlBody += json2html.transform(element, transform);
}

function setUpTransform(elementName, element) {
	var keys = _.keys(element);

	for (var i = 0, j = keys.length; i < j; i++) {
		var key = keys[i];
		var name = elementName ? elementName + "." + key : key;
		var value = element[keys[i]];

		if (typeof value === "object") {
			if (!blacklistedObject(name, key)) setUpTransform(name, value);
			else continue;
		} else if (isExcluded(name, key, value)) {
			continue;
		} else {
			transform.children.push([
				{
					tag: "h4",
					class: "attr",
					html: name
				},
				{
					tag: "div",
					html: "${" + name + "}"
				}
			]);
		}
	}
}

function blacklistedObject(name, key) {
	return _.find(exceptions.blacklist, function(i) {
		var substring = i.substr(0, i.length - 2);

		return i.slice(-2) === ".*" && (substring === name || substring === key);
	});
}

function isExcluded(name, key, value) {
	var isEmpty = value === "";
	var hasUnderscore = key.charAt(0) === "_";
	var blacklisted = _.find(exceptions.blacklist, function(i) {
		return i === name || i === key;
	});
	var whitelisted = _.find(exceptions.whitelist, function(i) {
		return i === name || i === key;
	});

	return blacklisted || isEmpty || (hasUnderscore && !whitelisted);
}

function writeHTML(done) {
	var template = "";
	var filename = htmlTitle + ".html";

	mu.compileAndRender(path.resolve(__dirname, "template.html"), {
		title: htmlTitle,
		body: htmlBody
	}).on("data", function(data) {
		template += data;		
	}).on("end", function() {
		fs.mkdir("adapt2html", function(err) {
			if (err && err.code !== "EEXIST") return console.log(err.toString());

			fs.writeFile(path.join("adapt2html", filename), template, function (err) {
				if (err) return console.log(err.toString());

				console.log("Written " + filename + ".");
				done();
			});
		});
	});
}

module.exports = {
	main: main
};