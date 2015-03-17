# adapt2html

Convert Adapt JSON to HTML.

## Installation

Note: requires [Node.js](http://nodejs.org) to be installed.

From the command line, run:
```
npm install -g adapt2html
```

## Usage

### Command

* Run this command inside a directory containing JSON files:
```
adapt2html
```
* HTML files will be created in an `adapt2html` subdirectory.
* Each HTML file may be opened in Word with headings formatted appropriately.

### Rules

* A JSON name/value pair will be included in the HTML if meets the following criteria:
 * Name doesn’t start with an underscore `_`
 * Value isn’t an empty string `""`
* Objects are checked recursively by default for accepted name/value pairs.
* [`exceptions.json`](exceptions.json) contains a blacklist and whitelist for exceptions to these rules.
* To override the default [`exceptions.json`](exceptions.json), simply include a version of this file in your working directory.
* Objects may be added to the blacklist with the syntax `<objectName>.*`