#!/usr/bin/env node

'use strict';

require('../dist/cli')
  .main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
