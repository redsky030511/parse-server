'use strict';
const UserController = require('../lib/Controllers/UserController')
  .UserController;
const Config = require('../lib/Config');
describe('ParseLiveQuery', function () {
  it('can subscribe to query', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    const object = new TestObject();
    await object.save();

    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();
    subscription.on('update', async object => {
      expect(object.get('foo')).toBe('bar');
      done();
    });
    object.set({ foo: 'bar' });
    await object.save();
  });

  it('can handle beforeConnect / beforeSubscribe hooks', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    const object = new TestObject();
    await object.save();

    Parse.Cloud.beforeSubscribe('TestObject', req => {
      expect(req.op).toBe('subscribe');
      expect(req.requestId).toBe(1);
      expect(req.query).toBeDefined();
      expect(req.user).toBeUndefined();
    });

    Parse.Cloud.beforeConnect(req => {
      expect(req.event).toBe('connect');
      expect(req.clients).toBe(0);
      expect(req.subscriptions).toBe(0);
      expect(req.useMasterKey).toBe(false);
      expect(req.installationId).toBeDefined();
      expect(req.user).toBeUndefined();
      expect(req.sessionToken).toBeUndefined();
      expect(req.client).toBeDefined();
    });
    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();
    subscription.on('update', async object => {
      expect(object.get('foo')).toBe('bar');
      done();
    });
    object.set({ foo: 'bar' });
    await object.save();
  });

  it('can handle beforeConnect error', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    const object = new TestObject();
    await object.save();

    Parse.Cloud.beforeConnect(() => {
      throw new Error('You shall not pass!');
    });
    Parse.LiveQuery.on('error', error => {
      expect(error).toBe('You shall not pass!');
      done();
    });
    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    await query.subscribe();
  });

  it('can handle beforeSubscribe error', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    const object = new TestObject();
    await object.save();

    Parse.Cloud.beforeSubscribe(TestObject, () => {
      throw new Error('You shall not subscribe!');
    });
    Parse.LiveQuery.on('error', error => {
      expect(error).toBe('You shall not subscribe!');
    });
    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();
    subscription.on('error', error => {
      expect(error).toBe('You shall not subscribe!');
      done();
    });
  });

  it('can handle mutate beforeSubscribe query', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    Parse.Cloud.beforeSubscribe(TestObject, request => {
      const query = request.query;
      query.equalTo('yolo', 'abc');
    });

    const object = new TestObject();
    await object.save();

    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();

    subscription.on('update', () => {
      fail();
    });
    object.set({ foo: 'bar' });
    await object.save();
    setTimeout(async () => {
      done();
    }, 1000);
  });

  it('can return a new beforeSubscribe query', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    Parse.Cloud.beforeSubscribe(TestObject, request => {
      const query = new Parse.Query(TestObject);
      query.equalTo('foo', 'yolo');
      request.query = query;
    });

    const query = new Parse.Query(TestObject);
    query.equalTo('foo', 'bar');
    const subscription = await query.subscribe();

    subscription.on('create', object => {
      expect(object.get('foo')).toBe('yolo');
      done();
    });
    const object = new TestObject();
    object.set({ foo: 'yolo' });
    await object.save();
  });

  it('can handle select beforeSubscribe query', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
    });
    Parse.Cloud.beforeSubscribe(TestObject, request => {
      const query = request.query;
      query.select('yolo');
    });

    const object = new TestObject();
    await object.save();

    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();

    subscription.on('update', object => {
      expect(object.get('foo')).toBeUndefined();
      expect(object.get('yolo')).toBe('abc');
      done();
    });
    object.set({ foo: 'bar', yolo: 'abc' });
    await object.save();
  });

  it('handle invalid websocket payload length', async done => {
    await reconfigureServer({
      liveQuery: {
        classNames: ['TestObject'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
      websocketTimeout: 100,
    });
    const object = new TestObject();
    await object.save();

    const query = new Parse.Query(TestObject);
    query.equalTo('objectId', object.id);
    const subscription = await query.subscribe();

    // All control frames must have a payload length of 125 bytes or less.
    // https://tools.ietf.org/html/rfc6455#section-5.5
    //
    // 0x89 = 10001001 = ping
    // 0xfe = 11111110 = first bit is masking the remaining 7 are 1111110 or 126 the payload length
    // https://tools.ietf.org/html/rfc6455#section-5.2
    const client = await Parse.CoreManager.getLiveQueryController().getDefaultLiveQueryClient();
    client.socket._socket.write(Buffer.from([0x89, 0xfe]));

    subscription.on('update', async object => {
      expect(object.get('foo')).toBe('bar');
      done();
    });
    // Wait for Websocket timeout to reconnect
    setTimeout(async () => {
      object.set({ foo: 'bar' });
      await object.save();
    }, 1000);
  });

  it('should execute live query update on email validation', async done => {
    const emailAdapter = {
      sendVerificationEmail: () => {},
      sendPasswordResetEmail: () => Promise.resolve(),
      sendMail: () => {},
    };

    await reconfigureServer({
      liveQuery: {
        classNames: ['_User'],
      },
      startLiveQueryServer: true,
      verbose: false,
      silent: true,
      websocketTimeout: 100,
      appName: 'liveQueryEmailValidation',
      verifyUserEmails: true,
      emailAdapter: emailAdapter,
      emailVerifyTokenValidityDuration: 20, // 0.5 second
      publicServerURL: 'http://localhost:8378/1',
    }).then(() => {
      const user = new Parse.User();
      user.set('password', 'asdf');
      user.set('email', 'asdf@example.com');
      user.set('username', 'zxcv');
      user
        .signUp()
        .then(() => {
          const config = Config.get('test');
          return config.database.find('_User', {
            username: 'zxcv',
          });
        })
        .then(async results => {
          const foundUser = results[0];
          const query = new Parse.Query('_User');
          query.equalTo('objectId', foundUser.objectId);
          const subscription = await query.subscribe();

          subscription.on('update', async object => {
            expect(object).toBeDefined();
            expect(object.get('emailVerified')).toBe(true);
            done();
          });

          const userController = new UserController(emailAdapter, 'test', {
            verifyUserEmails: true,
          });
          userController.verifyEmail(
            foundUser.username,
            foundUser._email_verify_token
          );
        });
    });
  });

  afterEach(async function (done) {
    const client = await Parse.CoreManager.getLiveQueryController().getDefaultLiveQueryClient();
    client.close();
    // Wait for live query client to disconnect
    setTimeout(() => {
      done();
    }, 1000);
  });
});
