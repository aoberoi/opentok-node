var expect = require('chai').expect,
    nock = require('nock'),
    _ = require('lodash'),
    async = require('async');

// Subject
var OpenTok = require('../lib/opentok.js'),
    Session = require('../lib/session.js'),
    package = require('../package.json');

// Fixtures
var apiKey = '123456',
    apiSecret = '1234567890abcdef1234567890abcdef1234567890',
    apiUrl = 'http://mymock.example.com',
    // This is specifically concocted for these tests (uses fake apiKey/apiSecret above)
    sessionId = '1_MX4xMjM0NTZ-flNhdCBNYXIgMTUgMTQ6NDI6MjMgUERUIDIwMTR-MC40OTAxMzAyNX4',
    badApiKey = 'badkey',
    badApiSecret = 'badsecret',
    defaultApiUrl = 'https://api.opentok.com';
nock.disableNetConnect();

var recording = false;
if (recording) {
  // set these values before changing the above to true
  apiKey = '';
  apiSecret = '';
  //nock.enableNetConnect();
  nock.recorder.rec();
}

// Helpers
var helpers = require('./helpers.js');

describe('OpenTok', function() {
  it('should initialize with a valid apiKey and apiSecret', function() {
    var opentok = new OpenTok(apiKey, apiSecret);
    expect(opentok).to.be.an.instanceof(OpenTok);
    expect(opentok.apiKey).to.be.equal(apiKey);
    expect(opentok.apiSecret).to.be.equal(apiSecret);
    expect(opentok.apiUrl).to.be.equal(defaultApiUrl);
  });
  it('should initialize without `new`', function() {
    var opentok = OpenTok(apiKey, apiSecret);
    expect(opentok).to.be.an.instanceof(OpenTok);
  });
  it('should not initialize with just an apiKey but no apiSecret', function() {
    expect(function() {
      var opentok = new OpenTok(apiKey);
    }).to.throw(Error);
  });
  it('should not initialize with incorrect type parameters', function() {
    expect(function() {
      var opentok = new OpenTok(new Date(), 'asdasdasdasdasd');
    }).to.throw(Error);
    expect(function() {
      opentok = new OpenTok(4, {});
    }).to.throw(Error);
  });
  it('should cooerce a number for the apiKey', function() {
    var opentok = new OpenTok(parseInt(apiKey), apiSecret);
    expect(opentok).to.be.an.instanceof(OpenTok);
  });

  describe('when initialized with an apiUrl', function() {
    beforeEach(function() {
      this.opentok = new OpenTok(apiKey, apiSecret, apiUrl);
    });
    it('exposes the custom apiUrl', function() {
      expect(this.opentok.apiUrl).to.be.equal(apiUrl);
    });
    it('sends its requests to the set apiUrl', function(done) {
       var scope = nock(apiUrl)
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "p2p.preference=enabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>SESSIONID</session_id><partner_id>123456</partner_id><create_dt>Wed Mar 19 23:35:24 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 06:35:24 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'mantis503-nyc.tokbox.com',
        'content-length': '211' });
      this.opentok.createSession(function(err, session){
        if (err) return done(err);
        expect(session).to.be.an.instanceof(Session);
        expect(session.sessionId).to.equal('SESSIONID');
        scope.done();
        done(err);
      });
    });
  });

  describe('when initialized with a proxy', function() {
    beforeEach(function() {
      // TODO: remove temporary proxy value
      this.proxyUrl = 'http://localhost:8080';
      this.opentok = new OpenTok(apiKey, apiSecret, { proxy: this.proxyUrl });
    });
    it('sends its requests through an http proxy', function(done) {
      this.timeout(10000);
      var scope = nock('https://api.opentok.com:443')
        .post('/session/create', "p2p.preference=enabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>1_MX44NTQ1MTF-flN1biBKdWwgMTMgMjE6MjY6MzUgUERUIDIwMTR-MC40OTU0NzA0Nn5Qfg</session_id><partner_id>854511</partner_id><create_dt>Sun Jul 13 21:26:35 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Mon, 14 Jul 2014 04:26:35 GMT',
        'content-type': 'application/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'mantis402-oak.tokbox.com',
        'content-length': '274' });
      this.opentok.createSession(function(err, session) {
        scope.done();
        done(err);
      });
    });
  });

  describe('when initialized with a timeout', function() {
    beforeEach(function() {
      this.timeoutLength = 500;
      this.opentok = new OpenTok(apiKey, apiSecret, { timeout: this.timeoutLength });
    });
    it('times out when the request takes longer than the specified timeout', function(done) {
      // make sure the mocha test runner doesn't time out for at least as long as we are willing to
      // wait plus some reasonable amount of overhead time (100ms)
      this.timeout(this.timeoutLength + 100);
      var scope = nock('https://api.opentok.com:443')
        .post('/session/create', "p2p.preference=enabled")
        .delayConnection(this.timeoutLength + 10)
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>1_MX44NTQ1MTF-flN1biBKdWwgMTMgMjE6MjY6MzUgUERUIDIwMTR-MC40OTU0NzA0Nn5Qfg</session_id><partner_id>854511</partner_id><create_dt>Sun Jul 13 21:26:35 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Mon, 14 Jul 2014 04:26:35 GMT',
        'content-type': 'application/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'mantis402-oak.tokbox.com',
        'content-length': '274' });
      this.opentok.createSession(function(err, session) {
        expect(err).to.be.an.instanceof(Error);
        scope.done();
        done();
      });
    });
  });

  describe('when initialized with bad credentials', function() {
    beforeEach(function() {
      this.opentok = new OpenTok(badApiKey, badApiSecret);
    });
    describe('#createSession', function() {
      it('throws a client error', function(done) {
        var scope = nock('https://api.opentok.com:443')
          .post('/session/create', "p2p.preference=enabled")
          .reply(403, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><errorPayload><code>-1</code><message>Invalid partner credentials</message></errorPayload>", { server: 'nginx',
          date: 'Fri, 30 May 2014 19:37:12 GMT',
          'content-type': 'application/xml',
          connection: 'keep-alive',
          'content-length': '145' });
        this.opentok.createSession(function(err, session) {
          expect(err).to.be.an.instanceof(Error);
          scope.done();
          done();
        });
      });
    });
  });

  describe('#createSession', function() {

    beforeEach(function() {
      this.opentok = new OpenTok(apiKey, apiSecret);
    });

    it('creates a new session', function(done) {
      var scope = nock('https://api.opentok.com:443')
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "p2p.preference=enabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>SESSIONID</session_id><partner_id>123456</partner_id><create_dt>Wed Mar 19 23:35:24 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 06:35:24 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'mantis503-nyc.tokbox.com',
        'content-length': '211' });
      // pass no options parameter
      this.opentok.createSession(function(err, session){
        if (err) return done(err);
        expect(session).to.be.an.instanceof(Session);
        expect(session.sessionId).to.equal('SESSIONID');
        expect(session.mediaMode).to.equal('relayed');
        scope.done();
        done(err);
      });
    });

    it('creates a media routed session', function(done) {
      var scope = nock('https://api.opentok.com:443')
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "p2p.preference=disabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>SESSIONID</session_id><partner_id>123456</partner_id><create_dt>Thu Mar 20 07:02:45 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 14:02:45 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'oms506-nyc.tokbox.com',
        'content-length': '211' });
      this.opentok.createSession({ 'mediaMode' : 'routed' }, function(err, session) {
        if (err) return done(err);
        expect(session).to.be.an.instanceof(Session);
        expect(session.sessionId).to.equal('SESSIONID');
        expect(session.mediaMode).to.equal('routed');
        scope.done();
        done(err);
      });
    });

    it('creates a media relayed session even if the media mode is invalid', function(done) {
      var scope = nock('https://api.opentok.com:443')
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "p2p.preference=enabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>SESSIONID</session_id><partner_id>123456</partner_id><create_dt>Thu Mar 20 07:02:45 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 14:02:45 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'oms506-nyc.tokbox.com',
        'content-length': '211' });
      this.opentok.createSession({ 'mediaMode' : 'blah' }, function(err, session) {
        if (err) return done(err);
        expect(session).to.be.an.instanceof(Session);
        expect(session.sessionId).to.equal('SESSIONID');
        expect(session.mediaMode).to.equal('relayed');
        scope.done();
        done(err);
      });
    });

    it('adds a location hint to the created session', function(done) {
      var scope = nock('https://api.opentok.com:443')
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "location=12.34.56.78&p2p.preference=enabled")
        .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sessions><Session><session_id>SESSIONID</session_id><partner_id>123456</partner_id><create_dt>Thu Mar 20 07:17:22 PDT 2014</create_dt></Session></sessions>", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 14:17:22 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'oms506-nyc.tokbox.com',
        'content-length': '211' });
      // passes location: '12.34.56.78'
      this.opentok.createSession({ 'location': '12.34.56.78' }, function(err, session) {
        if (err) return done(err);
        expect(session).to.be.an.instanceof(Session);
        expect(session.sessionId).to.equal('SESSIONID');
        expect(session.mediaMode).to.equal('relayed');
        expect(session.location).to.equal('12.34.56.78');
        scope.done();
        done(err);
      });
    });

    it('complains when the location value is not valid', function(done) {
      this.opentok.createSession({ location: 'not an ip address' }, function(err) {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });

    it('complains when there is no callback function', function() {
      expect(function() {
        var result = this.opentok.createSession();
      }).to.throw(Error);
    });

    it('complains when a server error takes place', function(done) {
      var scope = nock('https://api.opentok.com:443')
        .matchHeader('x-tb-partner-auth', apiKey+':'+apiSecret)
        .matchHeader('user-agent', new RegExp("OpenTok-Node-SDK\/"+package.version))
        .post('/session/create', "p2p.preference=enabled")
        .reply(500, "", { server: 'nginx',
        date: 'Thu, 20 Mar 2014 06:35:24 GMT',
        'content-type': 'text/xml',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
        'x-tb-host': 'mantis503-nyc.tokbox.com',
        'content-length': '0' });
      this.opentok.createSession(function(err, session) {
        expect(err).to.be.an.instanceof(Error);
        scope.done();
        done();
      });
    });

  });


  describe('#generateToken', function() {

    beforeEach(function() {
      this.opentok = new OpenTok(apiKey, apiSecret);
      this.sessionId = sessionId;
    });

    it('generates a token', function() {
      // call generateToken with no options
      var token = this.opentok.generateToken(this.sessionId);
      expect(token).to.be.a('string');
      expect(helpers.verifyTokenSignature(token, apiSecret)).to.be.true
      var decoded = helpers.decodeToken(token);
      expect(decoded.partner_id).to.equal(apiKey);
      expect(decoded.create_time).to.exist
      expect(decoded.nonce).to.exist
    });

    it('assigns a role in the token', function() {
      // expects one with no role defined to assign "publisher"
      var defaultRoleToken = this.opentok.generateToken(this.sessionId);
      expect(defaultRoleToken).to.be.a('string');
      expect(helpers.verifyTokenSignature(defaultRoleToken, apiSecret)).to.be.true
      var decoded = helpers.decodeToken(defaultRoleToken);
      expect(decoded.role).to.equal('publisher');

      // expects one with a valid role defined to set it
      var subscriberToken = this.opentok.generateToken(this.sessionId, { role : 'subscriber' });
      expect(subscriberToken).to.be.a('string');
      expect(helpers.verifyTokenSignature(subscriberToken, apiSecret)).to.be.true
      decoded = helpers.decodeToken(subscriberToken);
      expect(decoded.role).to.equal('subscriber');

      // expects one with an invalid role to complain
      var invalidToken = this.opentok.generateToken(this.sessionId, { role : 5 });
      expect(invalidToken).to.not.be.ok
    });

    it('sets an expiration time for the token', function() {
      // expects a token with no expiration time to assign 1 day
      var now = (new Date().getTime()) / 1000, delta = 10,
          inOneDay = now + (60*60*24);
      var defaultExpireToken = this.opentok.generateToken(this.sessionId);
      expect(defaultExpireToken).to.be.a('string');
      expect(helpers.verifyTokenSignature(defaultExpireToken, apiSecret)).to.be.true
      var decoded = helpers.decodeToken(defaultExpireToken);
      expect(decoded.expire_time).to.be.within(inOneDay-delta, inOneDay+delta);

      // expects a token with an expiration time to have it
      var expireTime = (new Date().getTime() / 1000) + (60*60); // 1 hour
      var oneHourToken = this.opentok.generateToken(this.sessionId, { expireTime: expireTime });
      expect(oneHourToken).to.be.a('string');
      expect(helpers.verifyTokenSignature(oneHourToken, apiSecret)).to.be.true
      decoded = helpers.decodeToken(oneHourToken);
      expect(decoded.expire_time).to.be.within(expireTime-delta, expireTime+delta);

      // expects a token with an invalid expiration time to complain
      var invalidToken = this.opentok.generateToken(this.sessionId, { expireTime: "not a time" });
      expect(invalidToken).to.not.be.ok;

      // TODO: expects a token with a time to thats in the past to complain
      //invalidToken = this.opentok.generateToken(this.sessionId, { expireTime: "not a time" });
      //expect(invalidToken).to.not.be.ok;
    });

    it('sets connection data in the token', function() {
      // expects a token with a connection data to have it
      var sampleData = 'name=Johnny';
      var dataBearingToken = this.opentok.generateToken(this.sessionId, { data: sampleData });
      expect(dataBearingToken).to.be.a('string');
      expect(helpers.verifyTokenSignature(dataBearingToken, apiSecret)).to.be.true
      var decoded = helpers.decodeToken(dataBearingToken);
      expect(decoded.connection_data).to.equal(sampleData);

      // expects a token with invalid connection to complain
      var invalidToken = this.opentok.generateToken(this.sessionId, { data: { 'dont': 'work' } });
      expect(invalidToken).to.not.be.ok;

      var tooLongDataToken = this.opentok.generateToken(this.sessionId, {
        data: Array(2000).join("a") // 1999 char string of all 'a's
      });
      expect(tooLongDataToken).to.not.be.ok;
    });

    it('complains if the sessionId is not valid', function() {
      var badToken = this.opentok.generateToken();
      expect(badToken).to.not.be.ok;

      badToken = this.opentok.generateToken('blahblahblah');
      expect(badToken).to.not.be.ok;
    });

    it('contains a unique nonce', function() {
      // generate a few and show the nonce exists each time and that they are different
      var tokens = [
        this.opentok.generateToken(this.sessionId),
        this.opentok.generateToken(this.sessionId)
      ];
      var nonces = _.map(tokens, function(token) { return helpers.decodeToken(token).nonce; });
      expect(_.uniq(nonces)).to.have.length(nonces.length);
    });
  });

});
