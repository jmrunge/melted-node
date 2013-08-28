var assert = require("assert");

var melted_node = require('../melted-node');
var mlt = new melted_node('localhost', 5250);

// SILENCE LOG OUTPUT
/*var util = require('util');
var fs = require('fs');
var log = fs.createWriteStream('/home/jmrunge/stdout.log');

console.log = console.info = function(t) {
  var out;
  if (t && ~t.indexOf('%')) {
    out = util.format.apply(util, arguments);
    process.stdout.write(out + '\n');
    return;
  } else {
    out = Array.prototype.join.call(arguments, ' ');
  }
  out && log.write(out + '\n');
};*/
// END SILENCE LOG OUTPUT

describe('connects', function(){
    before(function(done) {
        var result = mlt.connect();
        result.then(function() {
            done();
        }, function(err) {
            console.error("Error: " + err);
        });
    });
    describe('#connected', function(){
        it('--should return true', function(){
            assert.equal (mlt.connected, true);
        });
    });
    describe('#no pending messages', function(){
        it('--should return 0', function(){
            assert.equal (mlt.pending.length, 0);
        });
    });
    describe('#no errors', function(){
        it('--should return 0', function(){
            assert.equal (mlt.errors.length, 0);
        });
    });

});

describe('commands', function(){
    describe('#bad and good commands', function(){
        it('--should fail with unknown commands', function(done){
            mlt.sendPromisedCommand("no_such_command in my town").then(
                function(val){
                    return done(new Error(val));
                }, function(){ done(); });
        });
        it('--"load" should pass', function(done) {
            mlt.sendPromisedCommand("load u0 ./test/videos/SMPTE_Color_Bars_01.mp4").then(function(){done();}).done();
        });
        it('-- "play" should pass (after "load")', function(done) {
            mlt.sendPromisedCommand("play u0").then(function(){ done() }).done();
        });
        it('-- "append" shuold pass', function(done) {
            mlt.sendPromisedCommand("apnd u0 ./test/videos/SMPTE_Color_Bars_02.mp4").then(function() { done() }).done();
        });
    });
});

describe('queue', function() {
    describe('#add commands after queue processed', function(){
        before(function(done) {
            mlt.sendPromisedCommand("pause u0");
            mlt.sendPromisedCommand("play u0");
            setTimeout(function() {
                done();
            }, 1000);
        });
        it('--should return 1 because of previous test', function(){
            assert.equal (mlt.errors.length, 1);
        });
    });
});

describe('promise handlers', function() {
    describe('#execute handler function on success and on error', function() {
        var errorReceived = false;
        var responseReceived = false;
        before(function(done) {
            mlt.sendPromisedCommand("hohoho").then(undefined, callback);
            function callback(error) {
                console.error("TEST: Error: " + error);
                errorReceived = true;
                done();
            };
        });
        before(function(done) {
            mlt.sendPromisedCommand("list u0").then(callback);
            function callback(response) {
                console.log("TEST: Response: " + response);
                responseReceived = true;
                done();
            };
        });
        it('--incremented error count', function(){
            assert.equal (mlt.errors.length, 2);
        });
        it('--received error', function(){
            assert.equal (errorReceived, true);
        });
        it('--received response', function(){
            assert.equal (responseReceived, true);
        });
    });
});

describe('promised command', function() {
    describe('#receive promised object', function() {
        var error1Received = false;
        var response1Received = false;
        var error2Received = false;
        var response2Received = false;
        before(function(done) {
            var result = mlt.sendPromisedCommand("jijijiji", "200 OK");
            result.then(function(response) {
                console.log("TEST: Response: " + response);
                response1Received = true;
                done();
            }, function(error) {
                console.error("TEST: Error: " + error);
                error1Received = true;
                done();
            });
        });
        before(function(done) {
            var result = mlt.sendPromisedCommand("uls", "201 OK");
            result.then(function(response) {
                console.log("TEST: Response: " + response);
                response2Received = true;
                done();
            }, function(error) {
                console.error("TEST: Error: " + error);
                error2Received = true;
                done();
            });
        });
        it('--incremented error count', function(){
            assert.equal (mlt.errors.length, 3);
        });
        it('--received error for bad command', function(){
            assert.equal (error1Received, true);
        });
        it('--received response for bad command', function(){
            assert.equal (response1Received, false);
        });
        it('--received error for good command', function(){
            assert.equal (error2Received, false);
        });
        it('--received response for good command', function(){
            assert.equal (response2Received, true);
        });
    });
});

describe('xml', function() {
    describe('#add xml file with filter', function(){
        before(function(done) {
            mlt.sendPromisedCommand("load u0 ./test/melted-test.xml");
            mlt.sendPromisedCommand("play u0");
            setTimeout(function() {
                done();
            }, 1000);
        });
        it('--should return 3 because of previous test', function(){
            assert.equal(mlt.errors.length, 3);
        });
    });
});

describe('stress', function() {
    this.timeout(0);
    describe('#obtain status 100 times', function() {
        before(function(done) {
            var count = 0;
            setInterval(function() {
                if (count === 100) {
                    clearInterval(this);
                    done();
                }
                mlt.sendPromisedCommand("usta u0").then(function(response) {
                    console.log("USTA:" + response);
                    console.log("PASADA NRO: " + count);
                }, function(error) {
                    console.error("USTA: " + error);
                });
                console.log("mando goto");
                mlt.sendPromisedCommand("goto u0 " + count * 3).then(function(response) {
                    console.log("GOTO: " + response);
                }, function(error) {
                    console.error("GOTO: " + error);
                });
                count++;
            }, 50);
        });
        it('--should return 3 (no more errors!)', function(){
            assert.equal(mlt.errors.length, 3);
        });
        after(function(done) {
            mlt.sendPromisedCommand("stop u0", "200 OK").fin(function(result) {
                done();
            });
        });
    }) ;
});

describe('disconnect', function() {
    this.timeout(0);
    it('having commands in queue and disconnect shouldnt throw errors', function(done) {
        assert.doesNotThrow(function() {
            mlt.sendPromisedCommand("usta u0");
            mlt.sendPromisedCommand("usta u0");
            mlt.sendPromisedCommand("usta u0");
            mlt.sendPromisedCommand("usta u0");
            mlt.sendPromisedCommand("usta u0");
            mlt.disconnect().then(function(result) {
                console.log(result);
            }).fail(function(error) {
                console.log(error);
            }).fin(done);
        });
    });
    it('--disconnected', function() {
        assert.equal(mlt.connected, false);
    });
    it("reconnecting shouldn't throw errors", function(done) {
        mlt.sendPromisedCommand("usta u0", "202 OK");
        mlt.connect().then(function() {
            mlt.sendPromisedCommand("usta u0", "202 OK").then(function(){
                done();
            }, done);
        });
    });
});
