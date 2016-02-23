/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 10/23/2015
 * Time: 8:45 AM
 */

epiviz.Config.SETTINGS.dataProviders.push([
    'epiviz.data.BigwigDataProvider',
    'Roadmap',
    {
      'E001': {
        'H3K4me1': 'http://localhost/E001-H3K4me1.pval.signal.bigwig',
        'H3K4me3': 'http://egg2.wustl.edu/roadmap/data/byFileType/signal/consolidated/macs2signal/pval/E001-H3K4me3.pval.signal.bigwig',
        'H3K9ac': 'http://egg2.wustl.edu/roadmap/data/byFileType/signal/consolidated/macs2signal/pval/E001-H3K9ac.pval.signal.bigwig',
        'H3K9me3': 'http://egg2.wustl.edu/roadmap/data/byFileType/signal/consolidated/macs2signal/pval/E001-H3K9me3.pval.signal.bigwig',
        'H3K27me3': 'http://egg2.wustl.edu/roadmap/data/byFileType/signal/consolidated/macs2signal/pval/E001-H3K27me3.pval.signal.bigwig',
        'H3K36me3': 'http://egg2.wustl.edu/roadmap/data/byFileType/signal/consolidated/macs2signal/pval/E001-H3K36me3.pval.signal.bigwig'
      }
    },
    'http://localhost/bigwig/test/partial.php'
  ]

);
