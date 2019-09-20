#!/usr/bin/env node
'use strict';
const minimist = require('minimist');
const prompt = require('prompt');
const { exec } = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const chalk = require('chalk');
const options = minimist(process.argv.slice(2), {
  string: 'type',
  default: { type: 'patch' }
});
const incrementVersion = require('./modules/increment.js');
const { version } = require(join(process.cwd(), './package.json'));
const newVersion = incrementVersion(version, options.type);
const gitLogCommand =
  'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  - %s"';

const log = message => {
  // eslint-disable-next-line no-console
  console.log(message);
};

// this is the task to automate most of the release stuff...
//  because it is lame and boring
log(`

Preparing for a ${chalk.bgGreen.bold(options.type)} release...

`);

exec(gitLogCommand, (_, stdout) => {
  const history = existsSync('./history.md')
    ? readFileSync('./history.md')
    : '';
  const historyHeader = `### - ${newVersion} * ${new Date().toLocaleString()} *\n\n`;

  log('Updating the history.md file');

  writeFileSync(
    './history.md',
    `${historyHeader} ${stdout.trim()} \n\n\n ${history}`
  );

  exec('git log --all --format="%aN <%aE>" | sort -u', (errLog, stdoutLog) => {
    // write out the Authors file with all contributors
    log('Updating the AUTHORS file');

    writeFileSync('./AUTHORS', stdoutLog);

    exec('git add .', () => {
      exec(`git commit -m "preparing for release of v${newVersion}"`, () => {
        log('commited the automated updates');
        // run npm version
        exec(`npm version ${options.type}`, () => {
          log('npm version to rev for release');
          // ask for input
          prompt.start();
          prompt.get(
            {
              properties: {
                otp: {
                  description: 'If you are using 2FA for publishing enter it:',
                  required: false
                }
              }
            },
            (err, result) => {
              exec(`NPM_CONFIG_OTP=${result.otp} npm publish`, () => {
                log('pushing to origin');

                exec('git push origin HEAD', Function.prototype);
                exec(`git push origin v${newVersion}`, errPush => {
                  if (errPush) {
                    log(errPush);
                  }

                  log(chalk.green('DONE! Congrats on the Release!'));
                });
              });
            }
          );
        });
      });
    });
  });
});
