// This is a port of the test suite:
// hungry/js/test/parse_file_test.js

"use strict";

const request = require('request');

const str = "Hello World!";
const data = [];
for (let  i = 0; i < str.length; i++) {
  data.push(str.charCodeAt(i));
}

describe('Parse.File testing', () => {
  describe('creating files', () => {
    it('works with Content-Type', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        expect(b.name).toMatch(/_file.txt$/);
        expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/test\/.*file.txt$/);
        request.get(b.url, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('argle bargle');
          done();
        });
      });
    });


    it('works with _ContentType', done => {

      request.post({
        url: 'http://localhost:8378/1/files/file',
        body: JSON.stringify({
          _ApplicationId: 'test',
          _JavaScriptKey: 'test',
          _ContentType: 'text/html',
          base64: 'PGh0bWw+PC9odG1sPgo='
        })
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        expect(b.name).toMatch(/_file.html/);
        expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/test\/.*file.html$/);
        request.get(b.url, (error, response, body) => {
          try {
            expect(response.headers['content-type']).toMatch('^text/html');
            expect(error).toBe(null);
            expect(body).toEqual('<html></html>\n');
          } catch(e) {
            jfail(e);
          }
          done();
        });
      });
    });

    it('works without Content-Type', done => {
      const headers = {
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        expect(b.name).toMatch(/_file.txt$/);
        expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/test\/.*file.txt$/);
        request.get(b.url, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('argle bargle');
          done();
        });
      });
    });
  });

  it('supports REST end-to-end file create, read, delete, read', done => {
    const headers = {
      'Content-Type': 'image/jpeg',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/testfile.txt',
      body: 'check one two',
    }, (error, response, body) => {
      expect(error).toBe(null);
      const b = JSON.parse(body);
      expect(b.name).toMatch(/_testfile.txt$/);
      expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/test\/.*testfile.txt$/);
      request.get(b.url, (error, response, body) => {
        expect(error).toBe(null);
        expect(body).toEqual('check one two');
        request.del({
          headers: {
            'X-Parse-Application-Id': 'test',
            'X-Parse-REST-API-Key': 'rest',
            'X-Parse-Master-Key': 'test'
          },
          url: 'http://localhost:8378/1/files/' + b.name
        }, (error, response) => {
          expect(error).toBe(null);
          expect(response.statusCode).toEqual(200);
          request.get({
            headers: {
              'X-Parse-Application-Id': 'test',
              'X-Parse-REST-API-Key': 'rest'
            },
            url: b.url
          }, (error, response) => {
            expect(error).toBe(null);
            try {
              expect(response.statusCode).toEqual(404);
            } catch(e) {
              jfail(e);
            }
            done();
          });
        });
      });
    });
  });

  it('blocks file deletions with missing or incorrect master-key header', done => {
    const headers = {
      'Content-Type': 'image/jpeg',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/thefile.jpg',
      body: 'the file body'
    }, (error, response, body) => {
      expect(error).toBe(null);
      const b = JSON.parse(body);
      expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/test\/.*thefile.jpg$/);
      // missing X-Parse-Master-Key header
      request.del({
        headers: {
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest'
        },
        url: 'http://localhost:8378/1/files/' + b.name
      }, (error, response, body) => {
        expect(error).toBe(null);
        const del_b = JSON.parse(body);
        expect(response.statusCode).toEqual(403);
        expect(del_b.error).toMatch(/unauthorized/);
        // incorrect X-Parse-Master-Key header
        request.del({
          headers: {
            'X-Parse-Application-Id': 'test',
            'X-Parse-REST-API-Key': 'rest',
            'X-Parse-Master-Key': 'tryagain'
          },
          url: 'http://localhost:8378/1/files/' + b.name
        }, (error, response, body) => {
          expect(error).toBe(null);
          const del_b2 = JSON.parse(body);
          expect(response.statusCode).toEqual(403);
          expect(del_b2.error).toMatch(/unauthorized/);
          done();
        });
      });
    });
  });

  it('handles other filetypes', done => {
    const headers = {
      'Content-Type': 'image/jpeg',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/file.jpg',
      body: 'argle bargle',
    }, (error, response, body) => {
      expect(error).toBe(null);
      const b = JSON.parse(body);
      expect(b.name).toMatch(/_file.jpg$/);
      expect(b.url).toMatch(/^http:\/\/localhost:8378\/1\/files\/.*file.jpg$/);
      request.get(b.url, (error, response, body) => {
        expect(error).toBe(null);
        expect(body).toEqual('argle bargle');
        done();
      });
    });
  });

  it("save file", done => {
    const file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());
    file.save(expectSuccess({
      success: function(result) {
        strictEqual(result, file);
        ok(file.name());
        ok(file.url());
        notEqual(file.name(), "hello.txt");
        done();
      }
    }, done));
  });

  it("save file in object", done => {
    const file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());
    file.save(expectSuccess({
      success: function(result) {
        strictEqual(result, file);
        ok(file.name());
        ok(file.url());
        notEqual(file.name(), "hello.txt");

        const object = new Parse.Object("TestObject");
        object.save({
          file: file
        }, expectSuccess({
          success: function(object) {
            (new Parse.Query("TestObject")).get(object.id, expectSuccess({
              success: function(objectAgain) {
                ok(objectAgain.get("file") instanceof Parse.File);
                done();
              }
            }));
          }
        }, done));
      }
    }, done));
  });

  it("save file in object with escaped characters in filename", done => {
    const file = new Parse.File("hello . txt", data, "text/plain");
    ok(!file.url());
    file.save(expectSuccess({
      success: function(result) {
        strictEqual(result, file);
        ok(file.name());
        ok(file.url());
        notEqual(file.name(), "hello . txt");

        const object = new Parse.Object("TestObject");
        object.save({
          file: file
        }, expectSuccess({
          success: function(object) {
            (new Parse.Query("TestObject")).get(object.id, expectSuccess({
              success: function(objectAgain) {
                ok(objectAgain.get("file") instanceof Parse.File);

                done();
              }
            }));
          }
        }, done));
      }
    }, done));
  });

  it("autosave file in object", done => {
    let file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());
    const object = new Parse.Object("TestObject");
    object.save({
      file: file
    }, expectSuccess({
      success: function(object) {
        (new Parse.Query("TestObject")).get(object.id, expectSuccess({
          success: function(objectAgain) {
            file = objectAgain.get("file");
            ok(file instanceof Parse.File);
            ok(file.name());
            ok(file.url());
            notEqual(file.name(), "hello.txt");
            done();
          }
        }, done));
      }
    }, done));
  });

  it("autosave file in object in object", done => {
    let file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());

    const child = new Parse.Object("Child");
    child.set("file", file);

    const parent = new Parse.Object("Parent");
    parent.set("child", child);

    parent.save(expectSuccess({
      success: function(parent) {
        const query = new Parse.Query("Parent");
        query.include("child");
        query.get(parent.id, expectSuccess({
          success: function(parentAgain) {
            const childAgain = parentAgain.get("child");
            file = childAgain.get("file");
            ok(file instanceof Parse.File);
            ok(file.name());
            ok(file.url());
            notEqual(file.name(), "hello.txt");
            done();
          }
        }, done));
      }
    }, done));
  });

  it("saving an already saved file", done => {
    const file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());
    file.save(expectSuccess({
      success: function(result) {
        strictEqual(result, file);
        ok(file.name());
        ok(file.url());
        notEqual(file.name(), "hello.txt");
        const previousName = file.name();

        file.save(expectSuccess({
          success: function() {
            equal(file.name(), previousName);
            done();
          }
        }, done));
      }
    },  done));
  });

  it("two saves at the same time", done => {
    const file = new Parse.File("hello.txt", data, "text/plain");

    let firstName;
    let secondName;

    const firstSave = file.save().then(function() { firstName = file.name(); });
    const secondSave = file.save().then(function() { secondName = file.name(); });

    Parse.Promise.when(firstSave, secondSave).then(function() {
      equal(firstName, secondName);
      done();
    }, function(error) {
      ok(false, error);
      done();
    });
  });

  it("file toJSON testing", done => {
    const file = new Parse.File("hello.txt", data, "text/plain");
    ok(!file.url());
    const object = new Parse.Object("TestObject");
    object.save({
      file: file
    }, expectSuccess({
      success: function() {
        ok(object.toJSON().file.url);
        done();
      }
    }, done));
  });

  it("content-type used with no extension", done => {
    const headers = {
      'Content-Type': 'text/html',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/file',
      body: 'fee fi fo',
    }, (error, response, body) => {
      expect(error).toBe(null);
      const b = JSON.parse(body);
      expect(b.name).toMatch(/\.html$/);
      request.get(b.url, (error, response) => {
        if (!response) {
          fail('response should be set');
          return done();
        }
        expect(response.headers['content-type']).toMatch(/^text\/html/);
        done();
      });
    });
  });

  it("filename is url encoded", done => {
    const headers = {
      'Content-Type': 'text/html',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/hello world.txt',
      body: 'oh emm gee',
    }, (error, response, body) => {
      expect(error).toBe(null);
      const b = JSON.parse(body);
      expect(b.url).toMatch(/hello%20world/);
      done();
    })
  });

  it('supports array of files', done => {
    const file = {
      __type: 'File',
      url: 'http://meep.meep',
      name: 'meep'
    };
    const files = [file, file];
    const obj = new Parse.Object('FilesArrayTest');
    obj.set('files', files);
    obj.save().then(() => {
      const query = new Parse.Query('FilesArrayTest');
      return query.first();
    }).then((result) => {
      const filesAgain = result.get('files');
      expect(filesAgain.length).toEqual(2);
      expect(filesAgain[0].name()).toEqual('meep');
      expect(filesAgain[0].url()).toEqual('http://meep.meep');
      done();
    });
  });

  it('validates filename characters', done => {
    const headers = {
      'Content-Type': 'text/plain',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/di$avowed.txt',
      body: 'will fail',
    }, (error, response, body) => {
      const b = JSON.parse(body);
      expect(b.code).toEqual(122);
      done();
    });
  });

  it('validates filename length', done => {
    const headers = {
      'Content-Type': 'text/plain',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    const fileName = 'Onceuponamidnightdrearywhileiponderedweak' +
                   'andwearyOveramanyquaintandcuriousvolumeof' +
                   'forgottenloreWhileinoddednearlynappingsud' +
                   'denlytherecameatapping';
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/' + fileName,
      body: 'will fail',
    }, (error, response, body) => {
      const b = JSON.parse(body);
      expect(b.code).toEqual(122);
      done();
    });
  });

  it('supports a dictionary with file', done => {
    const file = {
      __type: 'File',
      url: 'http://meep.meep',
      name: 'meep'
    };
    const dict = {
      file: file
    };
    const obj = new Parse.Object('FileObjTest');
    obj.set('obj', dict);
    obj.save().then(() => {
      const query = new Parse.Query('FileObjTest');
      return query.first();
    }).then((result) => {
      const dictAgain = result.get('obj');
      expect(typeof dictAgain).toEqual('object');
      const fileAgain = dictAgain['file'];
      expect(fileAgain.name()).toEqual('meep');
      expect(fileAgain.url()).toEqual('http://meep.meep');
      done();
    }).catch((e) => {
      jfail(e);
      done();
    });
  });

  it('creates correct url for old files hosted on files.parsetfss.com', done => {
    const file = {
      __type: 'File',
      url: 'http://irrelevant.elephant/',
      name: 'tfss-123.txt'
    };
    const obj = new Parse.Object('OldFileTest');
    obj.set('oldfile', file);
    obj.save().then(() => {
      const query = new Parse.Query('OldFileTest');
      return query.first();
    }).then((result) => {
      const fileAgain = result.get('oldfile');
      expect(fileAgain.url()).toEqual(
        'http://files.parsetfss.com/test/tfss-123.txt'
      );
      done();
    }).catch((e) => {
      jfail(e);
      done();
    });
  });

  it('creates correct url for old files hosted on files.parse.com', done => {
    const file = {
      __type: 'File',
      url: 'http://irrelevant.elephant/',
      name: 'd6e80979-a128-4c57-a167-302f874700dc-123.txt'
    };
    const obj = new Parse.Object('OldFileTest');
    obj.set('oldfile', file);
    obj.save().then(() => {
      const query = new Parse.Query('OldFileTest');
      return query.first();
    }).then((result) => {
      const fileAgain = result.get('oldfile');
      expect(fileAgain.url()).toEqual(
        'http://files.parse.com/test/d6e80979-a128-4c57-a167-302f874700dc-123.txt'
      );
      done();
    }).catch((e) => {
      jfail(e);
      done();
    });
  });

  it('supports files in objects without urls', done => {
    const file = {
      __type: 'File',
      name: '123.txt'
    };
    const obj = new Parse.Object('FileTest');
    obj.set('file', file);
    obj.save().then(() => {
      const query = new Parse.Query('FileTest');
      return query.first();
    }).then(result => {
      const fileAgain = result.get('file');
      expect(fileAgain.url()).toMatch(/123.txt$/);
      done();
    }).catch((e) => {
      jfail(e);
      done();
    });
  });

  it('return with publicServerURL when provided', done => {
    reconfigureServer({
      publicServerURL: 'https://mydomain/parse'
    }).then(() => {
      const file = {
        __type: 'File',
        name: '123.txt'
      };
      const obj = new Parse.Object('FileTest');
      obj.set('file', file);
      return obj.save()
    }).then(() => {
      const query = new Parse.Query('FileTest');
      return query.first();
    }).then(result => {
      const fileAgain = result.get('file');
      expect(fileAgain.url().indexOf('https://mydomain/parse')).toBe(0);
      done();
    }).catch((e) => {
      jfail(e);
      done();
    });
  });

  it('fails to upload an empty file', done => {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/file.txt',
      body: '',
    }, (error, response, body) => {
      expect(error).toBe(null);
      expect(response.statusCode).toBe(400);
      expect(body).toEqual('{"code":130,"error":"Invalid file upload."}');
      done();
    });
  });

  it('fails to upload without a file name', done => {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/',
      body: 'yolo',
    }, (error, response, body) => {
      expect(error).toBe(null);
      expect(response.statusCode).toBe(400);
      expect(body).toEqual('{"code":122,"error":"Filename not provided."}');
      done();
    });
  });

  it('fails to upload without a file name', done => {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest'
    };
    request.post({
      headers: headers,
      url: 'http://localhost:8378/1/files/',
      body: 'yolo',
    }, (error, response, body) => {
      expect(error).toBe(null);
      expect(response.statusCode).toBe(400);
      expect(body).toEqual('{"code":122,"error":"Filename not provided."}');
      done();
    });
  });

  it('fails to delete an unkown file', done => {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Parse-Application-Id': 'test',
      'X-Parse-REST-API-Key': 'rest',
      'X-Parse-Master-Key': 'test'
    };
    request.delete({
      headers: headers,
      url: 'http://localhost:8378/1/files/file.txt',
    }, (error, response, body) => {
      expect(error).toBe(null);
      expect(response.statusCode).toBe(400);
      expect(body).toEqual('{"code":153,"error":"Could not delete file."}');
      done();
    });
  });

  describe_only_db('mongo')('Gridstore Range tests', () => {
    it('supports range requests', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=0-5'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('argle ');
          done();
        });
      });
    });

    it('supports small range requests', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=0-2'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('arg');
          done();
        });
      });
    });

    // See specs https://www.greenbytes.de/tech/webdav/draft-ietf-httpbis-p5-range-latest.html#byte.ranges
    it('supports getting one byte', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=2-2'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('g');
          done();
        });
      });
    });

    it('supports getting last n bytes', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'something different',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=-4'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body.length).toBe(4);
          expect(body).toEqual('rent');
          done();
        });
      });
    });

    it('supports getting first n bytes', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'something different',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=10-'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('different');
          done();
        });
      });
    });

    function repeat(string, count) {
      let s = string;
      while (count > 0) {
        s += string;
        count--;
      }
      return s;
    }

    it('supports large range requests', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: repeat('argle bargle', 100)
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=13-240'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body.length).toEqual(228);
          expect(body.indexOf('rgle barglea')).toBe(0);
          done();
        });
      });
    });

    it('fails to stream unknown file', done => {
      request.get({ url: 'http://localhost:8378/1/files/test/file.txt', headers: {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest',
        'Range': 'bytes=13-240'
      } }, (error, response, body) => {
        expect(error).toBe(null);
        expect(response.statusCode).toBe(404);
        expect(body).toEqual('File not found.');
        done();
      });
    });
  });

  // Because GridStore is not loaded on PG, those are perfect
  // for fallback tests
  describe_only_db('postgres')('Default Range tests', () => {
    it('fallback to regular request', done => {
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Parse-Application-Id': 'test',
        'X-Parse-REST-API-Key': 'rest'
      };
      request.post({
        headers: headers,
        url: 'http://localhost:8378/1/files/file.txt',
        body: 'argle bargle',
      }, (error, response, body) => {
        expect(error).toBe(null);
        const b = JSON.parse(body);
        request.get({ url: b.url, headers: {
          'Content-Type': 'application/octet-stream',
          'X-Parse-Application-Id': 'test',
          'X-Parse-REST-API-Key': 'rest',
          'Range': 'bytes=0-5'
        } }, (error, response, body) => {
          expect(error).toBe(null);
          expect(body).toEqual('argle bargle');
          done();
        });
      });
    });
  });
});
