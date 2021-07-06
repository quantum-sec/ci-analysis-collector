const SpecReporter = require('jasmine-spec-reporter').SpecReporter;
const { JUnitXmlReporter } = require('jasmine-reporters');

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter({
  spec: {
    displayPending: true,
  },
  summary: {
    displayDuration: true,
  },
}));

jasmine.getEnv().addReporter(new JUnitXmlReporter({
  savePath: './junit/',
  consolidateAll: false,
}));
