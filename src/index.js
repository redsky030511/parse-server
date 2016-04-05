import winston           from 'winston';
import ParseServer       from './ParseServer';
import S3Adapter         from 'parse-server-s3-adapter'
import FileSystemAdapter from 'parse-server-fs-adapter'
import { useExternal }   from './deprecated'

if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER) {
  winston.level = 'silly';
}

if (process.env.DEBUG || process.env.DEBUG_PARSE_SERVER) {
  winston.level = 'debug';
}

// Factory function
let _ParseServer = function(options) {
  let server = new ParseServer(options);
  return server.app;
}
// Mount the create liveQueryServer
_ParseServer.createLiveQueryServer = ParseServer.createLiveQueryServer;

let GCSAdapter = useExternal('GCSAdapter', 'parse-server-gcs-adapter');

export default ParseServer;
export { S3Adapter, GCSAdapter, FileSystemAdapter, _ParseServer as ParseServer };
