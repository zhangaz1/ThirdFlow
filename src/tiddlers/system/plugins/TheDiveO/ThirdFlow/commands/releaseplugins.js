/*\
created: 20180212171824929
type: application/javascript
title: $:/plugins/TheDiveO/ThirdFlow/commands/releaseplugins.js
tags:
modified: 20180212172043868
module-type: command
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";


/* Exports our --releaseplugins command, which packages all plugins marked for
 * release in this wiki, and then writes them to the local filesystem.
 */
exports.info = {
  name: "releaseplugins",
  synchronous: true
};


var RELEASE_CONFIG_TIDDLERS_PREFIX = "$:/config/ThirdFlow/plugins";
var RELEASE_CONFIG_FILTER = "[prefix[" + RELEASE_CONFIG_TIDDLERS_PREFIX + "/]]";
var DEFAULT_TID_TEMPLATE = "$:/core/templates/tid-tiddler";


/* Creates a new command instance. */
var Command = function(params, commander) {
  this.params = params;
  this.commander = commander;
  this.logger = new $tw.utils.Logger("--" + exports.info.name);
  this.warn = new $tw.utils.Logger("--" + exports.info.name, {colour: "brown/orange"});
  this.ok = new $tw.utils.Logger("--" + exports.info.name, {colour: "green"});
};


/* Executes our command. */
Command.prototype.execute = function() {
  var self = this;
  /* check your command parameters, which you will find in this.params */
  if (self.params.length) {
    self.warn.log("ignoring command parameter(s)");
  }

  var thirdflow = require("$:/plugins/TheDiveO/ThirdFlow/libs/thirdflow.js");
  var path = require("path");

  // Retrieve the release configuration tiddlers, then iterate over them
  // and package and render those plugins for which release is enabled.
  // Plugin-release config tiddler fields:
  //   release: must be "yes" to trigger release, otherwise the release config
  //     data gets ignored.
  //   text: mandatory name of plugin file name.
  //   template: optional title of a tempplate tiddler to be used for rendering
  //     the plugin output file.
  var releaseConfigs = $tw.wiki.filterTiddlers(RELEASE_CONFIG_FILTER);
  self.logger.log("release config tiddlers found:", releaseConfigs.length);
  $tw.utils.each(releaseConfigs, function(title) {
    var pluginTitle = title.substr(RELEASE_CONFIG_TIDDLERS_PREFIX.length + 1);
    var config = $tw.wiki.getTiddler(title);
    if (config) {
      var release = config.fields["release"] || "";
      var releaseName = config.fields.text.replace(/\r?\n|\r/g, "");
      var template = config.fields["template"] || DEFAULT_TID_TEMPLATE;
      var pluginContentsFilter = [
        "[prefix[" + pluginTitle + "/]]",
        config.fields["additional-tiddlers"] || ""
      ].join(" ");

      if (!releaseName || release !== "yes") {
        self.warn.log("skipping (disabled):", pluginTitle);
      } else {
        // (1) pack the plugin tiddler
        self.ok.log("packaging:", pluginTitle);
        self.logger.log("  with:", pluginContentsFilter);
        var err = thirdflow.packagePlugin($tw.wiki, pluginTitle, pluginContentsFilter);
        if (!err) {
          // (1.1) nice log...
          self.logger.log("  total:",
            Object.keys(JSON.parse($tw.wiki.getTiddler(pluginTitle).fields.text).tiddlers).length,
            "tiddlers");
          // (2) write the plugin tiddler
          var filename = path.resolve(self.commander.outputPath, releaseName);
          self.logger.log("writing to:", filename);
          err = thirdflow.renderTiddlerWithTemplate(
            self.commander.wiki, pluginTitle, template, filename
          );
          if (err) {
            self.logger.alert("writing failed:", err);
            return err;
          }
        } else {
          self.logger.alert("packaging failed:", err);
          return err;
        }
      }
    }
  });

  return null; /* no error. */
};


exports.Command = Command;

})();
