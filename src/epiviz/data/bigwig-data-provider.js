/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 10/7/2015
 * Time: 1:39 PM
 */

goog.provide('epiviz.data.BigwigDataProvider');

/**
 * @param {string} id
 * @param {Object.<string, Object.<string, string>>} bigwigFiles A map of data source name => web address of bigwig file
 * @param {string} [proxyEndpoint]
 * @constructor
 * @extends epiviz.data.DataProvider
 */
epiviz.data.BigwigDataProvider = function(id, bigwigFiles, proxyEndpoint) {
  epiviz.data.DataProvider.call(this, id);

  /**
   * @type {Object.<string, Object.<string, string>>}
   * @private
   */
  this._dataSourceMap = bigwigFiles;

  /**
   * @type {Array.<string>}
   * @private
   */
  this._dataSources = Object.keys(this._dataSourceMap);

  /**
   * @type {string}
   * @private
   */
  this._proxyEndpoint = proxyEndpoint;


  /**
   * @type {Object.<string, bigwig.BigwigFile>}
   * @private
   */
  this._bigwigFiles = {};

  var self = this;
  u.each(this._dataSourceMap, function(ds, filesMap) {
    u.each(filesMap, function(label, uri) {
      self._bigwigFiles[ds + '-' + label] = new bigwig.BigwigFile(uri, proxyEndpoint);
    });
  });
};

goog.inherits(epiviz.data.BigwigDataProvider, epiviz.data.DataProvider);

/**
 * @param {epiviz.data.Request} request
 * @param {function(epiviz.data.Response.<*>)} callback
 */
epiviz.data.BigwigDataProvider.prototype.getData = function(request, callback) {
  if (request.isEmpty()) { return; }

  var remaining;

  var self = this;
  var action = request.get('action');
  var filesLabels = Object.keys(this._bigwigFiles);
  var files = filesLabels.map(function(label) { return self._bigwigFiles[label]; });
  switch (action) {
    case epiviz.data.Request.Action.GET_MEASUREMENTS:
      u.async.each(files, function(file) {
        return file.initialized;
      }).then(function() {
        callback(epiviz.data.Response.fromRawObject({
          requestId: request.id(),
          data: {
            id: filesLabels,
            name: filesLabels,
            type: u.array.fill(files.length, 'feature'),
            datasourceId: filesLabels.map(function(label) { return label.substr(0, label.indexOf('-')); }),
            datasourceGroup: filesLabels.map(function(label) { return label.substr(0, label.indexOf('-')); }),
            defaultChartType: u.array.fill(files.length, 'line'),
            annotation: u.array.fill(files.length, null),
            minValue: files.map(function(file) { return file.summary.min; }),
            maxValue: files.map(function(file) { return file.summary.max; }),
            metadata: u.array.fill(files.length, null)
          }
        }));
      });
      return;
    case epiviz.data.Request.Action.GET_SEQINFOS:
      u.async.each(files, function(file) {
        return file.initialized;
      }).then(function() {
        var chrs = {};
        files.forEach(function(file) {
          if (!file.chromosomes) { return; }
          file.chromosomes.forEach(function(item) {
            if (!(item.key in chrs) || item.chrSize > chrs[item.key][2]) {
              chrs[item.key] = [item.key, 0, item.chrSize];
            }
          });
        });

        callback(epiviz.data.Response.fromRawObject({
          requestId: request.id(),
          data: u.map(chrs, function(v) { return v; })
        }));
      });
      return;
    case epiviz.data.Request.Action.GET_COMBINED:
      var start = request.get('start');
      var end = request.get('end');
      var chr = request.get('seqName');

      var measurements = u.map(request.get('measurements'), function(msIds) { return msIds; }).reduce(function(a1, a2) { return a1.concat(a2); });
      /**
       * ds -> [ms]
       * @type {Object.<string, Array.<string>>}
       */
      //var measurements = request.get('measurements');

      var ret = {};

      remaining = measurements.length;

      u.async.each(measurements, function(m) {
        var file = self._bigwigFiles[m];
        var ds = m.substr(0, m.indexOf('-'));
        var deferred = new u.async.Deferred();
        file.query(chr, start, end, { maxBases: 50000, maxItems: 1000 })
          .then(function(records) {
            var d = ret[ds];
            if (d == undefined) {
              d = {
                rows: {
                  start: records.map(function(r) { return r.start; }),
                  end: records.map(function(r) { return r.end; })
                },
                cols: {},
                globalStartIndex: 0
              };
              ret[ds] = d;
            }
            d.cols[m] = records.map(function(r) { return r.value(bigwig.DataRecord.Aggregate.MAX); });
            if (d.cols[m].length < d.rows.start.length) {
              d.rows.start = d.rows.start.slice(0, d.cols[m].length);
              d.rows.end = d.rows.end.slice(0, d.cols[m].length);
            } else if (d.cols[m].length > d.rows.start.length) {
              d.cols[m] = d.cols[m].slice(0, d.rows.start.length);
            }
            deferred.callback();
          });
        return deferred;
      }).then(function() {
        callback(epiviz.data.Response.fromRawObject({
          requestId: request.id(),
          data: ret
        }));
      });
      return;
  }
};
