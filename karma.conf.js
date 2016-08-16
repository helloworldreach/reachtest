/*eslint max-len: [2, 120] */

const
	webpack = require('./webpack.config.js'),
	minimist = require('minimist'),
	child_process = require('child_process'),
	omit = require('lodash/omit'),
	args = minimist(process.argv.slice(2), {
		boolean: ['single-run', 'auto-watch', 'coverage', 'chrome', 'firefox', 'none']
	}),
	onlyChrome = args['chrome'] && !args['firefox'],
	onlyFirefox = args['firefox'] && !args['chrome'],
	noBrowser = args['none'],
	coverage = args['coverage'],
	singleRun = args['single-run'],
	testSuite = 'unit',
	sauceLabs = process.env.SAUCE_USERNAME != null && process.env.SAUCE_ACCESS_KEY != null,
	branchName = (() => {
		if(process.env.TRAVIS === 'true') {
			if(process.env.TRAVIS_PULL_REQUEST !== 'false') {
				return `PR #${process.env.TRAVIS_PULL_REQUEST}`;
			}
			return process.env.TRAVIS_BRANCH;
		}
		return child_process.execSync('git rev-parse --abbrev-ref HEAD').toString();
	})(),

	sauceLabsBrowser = d => {
		d.base = 'SauceLabs';
		if(process.env.PROXY) {
			d.proxy = {
				proxyType: 'manual',
				httpProxy: process.env.PROXY,
				sslProxy: process.env.PROXY
			};
		}
		return d;
	},

	// Chrome flags
	flags = [
		// see: http://peter.sh/experiments/chromium-command-line-switches/
		// Use fake device for Media Stream to replace actual camera and microphone.
		//'--use-fake-device-for-media-stream',
		// Bypass the media stream infobar by selecting the default device for media streams (e.g. WebRTC).
		// Works with --use-fake-device-for-media-stream.
		'--use-fake-ui-for-media-stream'
	],
	// firefox prefs
	prefs = {
		'media.navigator.permission.disabled': true
	},

	sauceLabsBrowsers = {
		// sl_edge: sauceLabsBrowser({
		// 	browserName: 'MicrosoftEdge',
		// 	platform: 'Windows 10',
		// 	version: '13'
		// }),
		sl_chrome_latest: sauceLabsBrowser({
			browserName: 'chrome',
			platform: 'Windows 7',
			version: 'latest',
			flags
		}),
		sl_chrome_latest_1: sauceLabsBrowser({
			browserName: 'chrome',
			platform: 'Windows 10',
			version: 'latest-1',
			flags
		}),
		sl_chrome_minimum: sauceLabsBrowser({
			browserName: 'chrome',
			platform: 'OS X 10.11',
			version: '38',
			flags
		}),
		sl_firefox_latest: sauceLabsBrowser({
			browserName: 'firefox',
			platform: 'Windows 10',
			version: 'latest',
			prefs
		}),
		sl_firefox_latest_1: sauceLabsBrowser({
			browserName: 'firefox',
			platform: 'OS X 10.11',
			version: 'latest-1',
			prefs
		}),
		sl_firefox_minimum: sauceLabsBrowser({
			browserName: 'firefox',
			version: '31',
			prefs
		}),
		sl_android_lollipop: sauceLabsBrowser({
			browserName: 'android',
			platform: 'Linux',
			version: '5.1',
			deviceName: 'Android Emulator',
			deviceOrientation: 'portrait'
		})
	},

	localBrowsers = noBrowser ? [] : omit({
		Chrome_auto_allow_gum: {
			base: 'Chrome',
			flags
		},
		Firefox_auto_allow_gum: {
			base: 'Firefox',
			prefs
		}
	}, onlyChrome ? ['Firefox_auto_allow_gum'] : (onlyFirefox ? ['Chrome_auto_allow_gum'] : [])),
	customLaunchers = sauceLabs ? sauceLabsBrowsers : localBrowsers,
	browsers = Object.keys(customLaunchers);

const account = require('./credentials');
if(!(account && (account.WEBCOM_TOKEN || (account.WEBCOM_EMAIL && account.WEBCOM_PASSWORD)))) {
	console.error('Missing Webcom credentials.');
	console.error('\t- Use \'npm run jwt\' to generate a token and export it as a env variable named \'WEBCOM_TOKEN\'');
	console.error('\t- Use a .account.json file to declare your login/password/namespace');
	process.exit(1);
}

console.info(
	`\n\tTest Platform: ${account.WEBCOM_PROTOCOL}://${account.WEBCOM_DOMAIN}`.replace(/'/g, ''),
	`\n\tTravis: ${process.env.TRAVIS === 'true'}`,
	`\n\tPullRequest: ${process.env.TRAVIS_PULL_REQUEST}`,
	`\n\tTravis Branch: ${process.env.TRAVIS_BRANCH}`,
	`\n\tBranch: ${branchName}`
);

module.exports = function(config) {
	config.set({
		basePath: __dirname,
		browserNoActivityTimeout: sauceLabs ? 120000 : 10000,
		browserDisconnectTolerance: 5,
		captureTimeout: sauceLabs ? 0 : 60 * 1000,
		client: {
			captureConsole: false
		},
		colors: true,
		frameworks: ['jasmine'],
		concurrency: process.env.TRAVIS === 'true' ? 1 : Number.POSITIVE_INFINITY,
		customLaunchers,
		browsers,
		reporters: (() => {
			const list = ['progress', 'dots', 'kjhtml', 'html'];
			if(coverage) {
				list.push('coverage');
			}
			if (sauceLabs) {
				list.push('saucelabs');
			}
			return list;
		})(),
		// the default configuration
		htmlReporter: {
			outputDir: 'report', // where to put the reports
			focusOnFailures: true, // reports show failures on start
			namedFiles: true, // name files instead of creating sub-directories
			urlFriendlyName: true // simply replaces spaces with _ for files/dirs
		},
		files: [
			{pattern: 'node_modules/webcom/webcom.js', included: true, watched: false},
			{pattern: 'dist/rules.json', included: false, nocache: true},
			`test/suites.${testSuite}.js`,
			'test/main.js'
		],
		preprocessors: {
			'src/**/*.js': ['webpack', 'sourcemap'],
			'test/**/*.js': ['webpack', 'sourcemap']
		},
		webpack: webpack.configure({
			output: false,
			release: false,
			debug: !singleRun && !coverage,
			coverage
		}),
		webpackMiddleware: {
			noInfo: true
		},
		sauceLabs: {
			testName: `[Reach][${branchName}] Unit Tests`,
			connectOptions: {
				proxy: process.env.PROXY,
				vmVersion: 'dev-varnish',
				directDomains: '*.datasync.orange.com',
				noSslBumpDomains: '*.datasync.orange.com'
			}
		},
		coverageReporter: (() => {
			if (coverage) {
				return {
					reporters: [
						{type: 'lcov', subdir: '.', file: 'lcov.info' }
					]
				};
			}
			return undefined;
		})()
	});
};
