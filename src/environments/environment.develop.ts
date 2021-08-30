import { Environment } from './models/environment.interface';

/**
 * // The file contents for the current environment will overwrite these during build.
 * // The build system defaults to the dev environment which uses `environment.ts`, but if you do
 * // `ng build --env=develop` then `environment.develop.ts` will be used instead.
 * // The list of which env maps to which file can be found in `.angular-cli.json`.
 */

export const environment: Environment = {
  production: true,
  API_HOST: 'https://appdevelop.virtamed.cloud',
  version: '1.00.0-0-develop',
};
