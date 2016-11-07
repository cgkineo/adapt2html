var _ = require("underscore");
var async = require("async");
var exceptions = require("./exceptions.json");
var fs = require("fs");
var json2html = require("node-json2html");
var mu = require("mu2");
var path = require("path");

function main(cwd, callback) {
	var htmlTitle;
	var htmlBody;
	var transform = { tag: "div", class: "element" };

	console.log("Running adapt2html...");

	fs.readdir(cwd, function(err, files) {
		err ? callback(err) : async.each(files, processFile, callback);
	});

	function processFile(file, done) {
		if (path.extname(file) !== ".json") return done();

		if (file === "exceptions.json") {
			exceptions = require(path.join(process.cwd(), "exceptions.json"));
			console.log("Found custom exceptions.json.");

			return done();
		}

		fs.readFile(path.join(cwd, file), function(err, output) {
			if (err) return done(err);

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
		var displayTitle = element.displayTitle ? "${displayTitle}" : "&lt;empty&gt;";

		transform.children = [
			{ tag: "h2", class: "border-title", html: "${_id} ${_component} ${_type}" },
			{ tag: "span", class: "attr", html: "displayTitle" },
			{ tag: "h3", class: "display-title", html: displayTitle }
		];

		setUpTransform(null, element);
		htmlBody += json2html.transform(element, transform);
	}

	function setUpTransform(elementName, element) {
		var keys = _.keys(element);

		for (var i = 0, j = keys.length; i < j; i++) {
			var key = keys[i];
			var name = elementName ? elementName + "." + key : key;
			var value = element[key];

			if (shouldBeExcluded(name, key, value)) continue;

			if (typeof value === "object") {
				setUpTransform(name, value);
				continue;
			}

			transform.children.push([
				{ tag: "h4", class: "attr", html: name },
				{ tag: "div", html: "${" + name + "}" }
			]);
		}
	}

	function shouldBeExcluded(name, key, value) {
		if (typeof value === "object") {
			return _.find(exceptions.blacklist, function(i) {
				var substring = i.substr(0, i.length - 2);

				return i.slice(-2) === ".*" && (substring === name || substring === key);
			});
		}

		var isException = function(list) {
			return _.find(exceptions[list], function(i) {
				return i === name || i === key;
			});
		};
		var isEmpty = value === "";
		var hasUnderscore = key.charAt(0) === "_";

		return isException("blacklist") || isEmpty ||
			(hasUnderscore && !isException("whitelist"));
	}

	function writeHTML(done) {
		var template = "";
		var dir = path.join(cwd, "adapt2html");
		var filename = htmlTitle + ".html";

		mu.compileAndRender(path.resolve(__dirname, "template.html"), {
			title: htmlTitle,
			body: htmlBody
		}).on("data", function(data) {
			template += data;
		}).on("end", function() {
			fs.mkdir(dir, function(err) {
				if (err && err.code !== "EEXIST") return done(err);

				fs.writeFile(path.join(dir, filename), template, function(err) {
					if (err) return done(err);

					console.log("Written " + filename + ".");
					done();
				});
			});
		});
	}
}

module.exports = { main: main };