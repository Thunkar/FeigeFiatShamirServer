var bigInt = require('big-integer'),
    server = require('../server.js'),
    fs = require('fs'),
    winston = require('winston');

function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    var result = str.substr(0, index) + chr + str.substr(index + 1);
    return result;
}

function byteString(n) {
    if (n < 0 || n > 255 || n % 1 !== 0) {
        throw new Error(n + " does not fit in a byte");
    }
    return ("000000000" + n.toString(2)).substr(-8)
}

var bigSqrt = function (n) {
    n = bigInt(n);
    if (n.compare(1) == 0) return 1;
    var x = n.divide(2);
    while (true) {
        var y = x.add(n.divide(x)).shiftRight(1);
        if (y.compare(x) >= 0) {
            return x;
        }
        x = y;
    }
}

var randomPrimeSearch = function (max) {
    var primes = [];
    for (var i = 0; i < max; i++) {
        var bigPrime;
        do {
            bigPrime = bigInt.randBetween("1e100", "1e200");
        } while(!bigPrime.isProbablePrime(50))
        primes.push(bigPrime.toString());
    }
    return primes;
}

var erathostenesSieve = function (max) {
    var n = bigInt(max), primeIndexes = new Buffer(n.divide(8).add(1).toJSNumber()), upperLimit = bigSqrt(bigInt(max)), primes = [];
    
    primeIndexes.fill(85);
    primeIndexes[0] = parseInt("01110101", 2);
    
    for (var i = bigInt(2); i.compare(upperLimit) <= 0; i = i.next()) {
        var checkbit = i.divmod(8);
        var byteIndex = checkbit.quotient.toJSNumber();
        var bitIndex = checkbit.remainder.toJSNumber();
        if (byteString(primeIndexes[byteIndex]).charAt(bitIndex) == '1') {
            for (var j = i.multiply(i); j.compare(n) < 0; j = j.add(i)) {
                var modifybit = j.divmod(8);
                byteIndex = modifybit.quotient.toJSNumber();
                bitIndex = modifybit.remainder.toJSNumber();
                var byte = byteString(primeIndexes[byteIndex]);
                byte = setCharAt(byte, bitIndex, '0');
                primeIndexes[byteIndex] = parseInt(byte, 2);
            }
        }
    }
    
    for (var i = bigInt(2); i.compare(n) < 0; i = i.next()) {
        var checkbit = i.divmod(8);
        var byteIndex = checkbit.quotient.toJSNumber();
        var bitIndex = checkbit.remainder.toJSNumber();
        if (byteString(primeIndexes[byteIndex]).charAt(bitIndex) == '1') {
            primes.push(bigInt(byteIndex).multiply(8).add(bitIndex).toString());
        }
    }
    return primes;
};

var primeGenerator = function (max, method) {
    if (method == "sieve")
        return erathostenesSieve(max);
    else
        return randomPrimeSearch(max);
}

var systemLogger = winston.loggers.get("system");

if (fs.existsSync('./precalc/primes.json'))
    systemLogger.info("Precalculated primes found");
else {
    systemLogger.info("Generating primes...");
    fs.writeFileSync('./precalc/primes.json', JSON.stringify(primeGenerator(server.config.max, server.config.primeSearch), null, 4));
}

systemLogger.info("Loading primes");
var primes = JSON.parse(fs.readFileSync('./precalc/primes.json').toString());
systemLogger.info("Primes loaded");

var generateCoprime = function (n) {
    var coprime;
    
    do {
        coprime = bigInt.randBetween(1, n);
    } 
	while (bigInt.gcd(n, coprime) != 1);
    
    return coprime;
}

var setupFFS = function (k) {
    var p = bigInt(primes[bigInt.randBetween(0, primes.length - 1)]);
    var q = bigInt(primes[bigInt.randBetween(0, primes.length - 1)]);
    var n = p.multiply(q);
    var s = [];
    var v = [];
    for (var i = 0; i < k; i++) {
        var si = generateCoprime(n);
        var vi = si.square().mod(n);
        v.push(vi.toString());
        s.push(si.toString())
    }
    return { n: n.toString(), s: s, v: v, k: k.toString() };
}

var generateX = function (n) {
    n = bigInt(n);
    var x, r;
    do {
        r = bigInt.randBetween(1, n);
        var s = bigInt.randBetween(-1, 1);
        x = s.multiply(r.square()).mod(n);
    } while (x.compare(0) == 0);
    return { x: x.toString(), r: r.toString() }
}

var generateFX = function (n, v) {
    n = bigInt(n);
    var fx;
    do {
        var fy = bigInt.randBetween(1, n);
        fx = fy.square();
        for (var i = 0; i < v.length; i++) {
            var vi = bigInt(v[i]);
            var ai = bigInt.randBetween(-1, 0);
            fx = vi.pow(ai).multiply(fx);
        }
        fx = fx.mod(n);
    } while (fx.compare(0) == 0);
    return { fx: fx.toString(), fy: fy.toString() }
}

var generateY = function (r, s, a, n) {
    var y = bigInt(r);
    n = bigInt(n);
    for (var i = 0; i < s.length; i++) {
        var si = bigInt(s[i]);
        var ai = bigInt(a[i]);
        y = si.pow(ai).multiply(y);
    }
    y = y.mod(n);
    return { y: y.toString() };
}

exports.bigSqrt = bigSqrt;
exports.primeGenerator = primeGenerator;
exports.setupFFS = setupFFS;
exports.generateX = generateX;
exports.generateFX = generateFX;
exports.generateY = generateY;