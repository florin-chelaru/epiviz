/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 10/7/2015
 * Time: 1:39 PM
 */

goog.provide('epiviz.data.BigwigDataProvider');

/**
 * @param {string} id
 * @param {Object.<string, string>} bigwigFiles A map of data source name => web address of bigwig file
 * @param {string} [proxyEndpoint]
 * @constructor
 * @extends epiviz.data.DataProvider
 */
epiviz.data.BigwigDataProvider = function(id, bigwigFiles, proxyEndpoint) {
  epiviz.data.DataProvider.call(this, id);

  /**
   * @type {Object.<string, string>}
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
  u.each(this._dataSourceMap, function(ds, uri) {
    self._bigwigFiles[ds] = new bigwig.BigwigFile(uri, proxyEndpoint);
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
  switch (action) {
    case epiviz.data.Request.Action.GET_MEASUREMENTS:
      remaining = this._dataSources.length;
      u.each(this._bigwigFiles, function(ds, file) {
        file.initialized.then(function() {
          --remaining;
          if (!remaining) {
            callback(epiviz.data.Response.fromRawObject({
              requestId: request.id(),
              data: {
                id: self._dataSources,
                name: self._dataSources,
                type: u.array.fill(self._dataSources.length, 'feature'),
                datasourceId: self._dataSources,
                datasourceGroup: self._dataSources,
                defaultChartType: u.array.fill(self._dataSources.length, 'line'),
                annotation: u.array.fill(self._dataSources.length, null),
                minValue: self._dataSources.map(function(ds) { return self._bigwigFiles[ds].summary.min; }),
                maxValue: self._dataSources.map(function(ds) { return self._bigwigFiles[ds].summary.max; }),
                metadata: u.array.fill(self._dataSources.length, null)
              }
            }));
          }
        });
      });
      return;
    case epiviz.data.Request.Action.GET_SEQINFOS:
      remaining = this._dataSources.length;
      u.each(this._bigwigFiles, function(ds, file) {
        file.initialized.then(function() {
          --remaining;
          if (!remaining) {
            var chrs = {};
            u.each(self._bigwigFiles, function(ds, file) {
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
          }
        });
      });
      return;
    case epiviz.data.Request.Action.GET_COMBINED:
      var start = request.get('start');
      var end = request.get('end');
      var chr = request.get('seqName');
      /**
       * We can do this because data source names are the same as the measurement names
       * @type {Array.<string>}
       */
      var measurements = Object.keys(request.get('measurements'));

      var ret = {};

      remaining = measurements.length;
      measurements.forEach(function(m) {
        var file = self._bigwigFiles[m];
        file.query(chr, start, end, { maxBases: 50000, maxItems: 1000 })
          .then(function(records) {
            var d = {
              rows: {
                start: records.map(function(r) { return r.start; }),
                end: records.map(function(r) { return r.end; })
              },
              cols: {},
              globalStartIndex: 0
            };
            d.cols[m] = records.map(function(r) { return r.value(bigwig.DataRecord.Aggregate.MAX); });
            ret[m] = d;

            --remaining;
            if (!remaining) {
              callback(epiviz.data.Response.fromRawObject({
                requestId: request.id(),
                data: ret
              }));
            }
          });
      });

      return;
  }
};
