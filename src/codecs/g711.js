(function(global, Math){

	var	fromCharCode	= String.fromCharCode,
		// the following two aren't really *performance optimization*, but compression optimization.
		y		= true,
		n		= false;

	function convertToBinaryLE(num, size){
		return size ? fromCharCode(num & 255) + convertToBinaryLE(num >> 8, size - 1) : '';
	}

	function convertToBinaryBE(num, size){ // I don't think this is right
		return size ? convertToBinaryBE(num >> 8, size - 1) + fromCharCode(255 - num & 255) : '';
	}

	function convertToBinary(num, size, bigEndian){
		return bigEndian ? convertToBinaryBE(num, size) : convertToBinaryLE(num, size);
	}

	function convertFromBinary(str, bigEndian){
		var	l	= str.length,
			last	= l - 1,
			n	= 0,
			pow	= Math.pow,
			i;
		if (bigEndian){
			for (i=0; i<l; i++){
				n += (255 - str.charCodeAt(i)) * pow(256, last - i);
			}
		} else {
			for (i=0; i < l; i++){
				n += str.charCodeAt(i) * pow(256, i);
			}
		}
		return n;
	}

	// The main function creates all the functions used.
	function Binary(bitCount, signed, /* false === unsigned */ isQ, from /* false === to */){

		// This is all just for major optimization benefits.
		var	pow			= Math.pow,
			floor			= Math.floor,
			convertFromBinary	= Binary.convertFromBinary,
			convertToBinary		= Binary.convertToBinary,
			byteCount		= bitCount / 8,
			bitMask			= pow(2, bitCount),
			semiMask		= bitMask / 2,
			intMask			= semiMask - 1,
			invSemiMask		= 1 / semiMask,
			invIntMask		= 1 / intMask;

		return from ?
			isQ ?
				signed ? function(num, bigEndian){
					num = floor(num < 0 ? num * semiMask + bitMask : num * intMask);
					return convertToBinary(
						num,
						byteCount,
						bigEndian
					);
				} : function(num, bigEndian){
					return convertToBinary(
						floor(num * intMask),
						byteCount,
						bigEndian
					);
				}
			:
				signed ? function(num, bigEndian){
					return convertToBinary(
						num < 0 ? num + bitMask : num,
						byteCount,
						bigEndian
					);
				} : function(num, bigEndian){
					return convertToBinary(
						num,
						byteCount,
						bigEndian
					);
				}
		:
			isQ ?
				signed ? function(str, bigEndian){
					var num = convertFromBinary(str, bigEndian);
					return num > intMask ? (num - bitMask) * invSemiMask : num * invIntMask;
				} : function(str, bigEndian){
					return convertFromBinary(str, bigEndian) * invIntMask;
				}
			:
				signed ? function(str, bigEndian){
					var num = convertFromBinary(str, bigEndian);
					return num > intMask ? num - bitMask : num;
				} : function(str, bigEndian){
					return convertFromBinary(str, bigEndian);
				};
	}

	Binary.convertToBinary		= convertToBinary;
	Binary.convertFromBinary	= convertFromBinary;
	// these are deprecated because JS doesn't support 64 bit uint, so the conversion can't be performed.
/*
	Binary.fromQ64			= Binary(64, y, y, y);
	Binary.toQ64			= Binary(64, y, y, n);
*/
	Binary.fromQ32			= Binary(32, y, y, y);
	Binary.toQ32			= Binary(32, y, y, n);
	Binary.fromQ24			= Binary(24, y, y, y);
	Binary.toQ24			= Binary(24, y, y, n);
	Binary.fromQ16			= Binary(16, y, y, y);
	Binary.toQ16			= Binary(16, y, y, n);
	Binary.fromQ8			= Binary( 8, y, y, y);
	Binary.toQ8			= Binary( 8, y, y, n);
	Binary.fromInt32		= Binary(32, y, n, y);
	Binary.toInt32			= Binary(32, y, n, n);
	Binary.fromInt16		= Binary(16, y, n, y);
	Binary.toInt16			= Binary(16, y, n, n);
	Binary.fromInt8			= Binary( 8, y, n, y);
	Binary.toInt8			= Binary( 8, y, n, n);
	Binary.fromUint32		= Binary(32, n, n, y);
	Binary.toUint32			= Binary(32, n, n, n);
	Binary.fromUint16		= Binary(16, n, n, y);
	Binary.toUint16			= Binary(16, n, n, n);
	Binary.fromUint8		= Binary( 8, n, n, y);
	Binary.toUint8			= Binary( 8, n, n, n);

	global.Binary = Binary;
}(this, Math));
(function(global, Binary){

function Stream(data){
	this.data = data;
}

var	proto	= Stream.prototype = {
		read:		function(length){
			var	self	= this,
				data	= self.data.substr(0, length);
			self.skip(length);
			return data;
		},
		skip:		function(length){
			var	self	= this,
				data	= self.data	= self.data.substr(length);
			self.pointer	+= length;
			return data.length;
		},
		readBuffer:	function(buffer, bitCount, type){
			var	self		= this,
				converter	= 'read' + type + bitCount,
				byteCount	= bitCount / 8,
				l		= buffer.length,
				i		= 0;
			while (self.data && i < l){
				buffer[i++] = self[converter]();
			}
			return i;
		}
	},
	i, match;

function newType(type, bitCount, fn){
	var	l	= bitCount / 8;
	proto['read' + type + bitCount] = function(bigEndian){
		return fn(this.read(l), bigEndian);
	};
}

for (i in Binary){
	match	= /to([a-z]+)([0-9]+)/i.exec(i);
	match && newType(match[1], match[2], Binary[i]);
}

global.Stream	= Stream;
Stream.newType	= newType;

}(this, this.Binary));
this.PCMData = (function(Binary, Stream){

function PCMData(data){
	return (typeof data === 'string' ? PCMData.decode : PCMData.encode)(data);
}

PCMData.decodeFrame = function(frame, bitCount, result){
	if (bitCount === 8){
		var buffer	= new (window.Int8Array || Array)(result.length);
		(new Stream(frame)).readBuffer(buffer, 8, 'Int');
		for (bitCount=0; bitCount<result.length; bitCount++){
			result[bitCount] = (buffer[bitCount]);
		}
	} else {
		(new Stream(frame)).readBuffer(result, bitCount, 'Q');
	}
	return result;
};

PCMData.encodeFrame = function(frame, bitCount){
	var	properWriter	= Binary[(bitCount === 8 ? 'fromInt' : 'fromQ') + bitCount],
		l		= frame.length,
		r		= '',
		i;
	if (bitCount === 8){
		for (i=0; i<l; i++){
			r += properWriter(frame[i]);
		}
	} else {
		for (i=0; i<l; i++){
			r += properWriter(frame[i]);
		}
	}
	return r;
};

PCMData.decode	= function(data, asyncCallback){
	var	stream			= new Stream(data),
		sGroupID1		= stream.read(4),
		dwFileLength		= stream.readUint32();
		stream			= new Stream(stream.read(dwFileLength));
	var	sRiffType		= stream.read(4),
		sGroupID2		= stream.read(4),
		dwChunkSize1		= stream.readUint32(),
		formatChunk		= new Stream(stream.read(dwChunkSize1)),
		wFormatTag		= formatChunk.readUint16(),
		wChannels		= formatChunk.readUint16(),
		dwSamplesPerSec		= formatChunk.readUint32(),
		dwAvgBytesPerSec	= formatChunk.readUint32(),
		wBlockAlign		= formatChunk.readUint16(),
		sampleSize		= wBlockAlign / wChannels,
		dwBitsPerSample		= /* dwChunkSize1 === 16 ? */ formatChunk.readUint16() /* : formatChunk.readUint32() */,
		sGroupID,
		dwChunkSize,
		sampleCount,
		chunkData,
		samples,
		dataTypeList,
		i,
		chunks	= {},
		output	= {
			channelCount:	wChannels,
			bytesPerSample:	wBlockAlign / wChannels,
			sampleRate:	dwAvgBytesPerSec / wBlockAlign,
			chunks:		chunks,
			data:		samples
		};

	function readChunk(){
		sGroupID		= stream.read(4);
		dwChunkSize		= stream.readUint32();
		chunkData		= stream.read(dwChunkSize);
		dataTypeList		= chunks[sGroupID] = chunks[sGroupID] || [];
		if (sGroupID === 'data'){
			sampleCount		= ~~(dwChunkSize / sampleSize);
			samples			= output.data = new (typeof Float32Array !== 'undefined' ? Float32Array : Array)(sampleCount);
			PCMData.decodeFrame(chunkData, sampleSize * 8, samples);
		} else {
			dataTypeList.push(chunkData);
		}
		asyncCallback && (stream.data ? setTimeout(readChunk, 1) : asyncCallback(output));
	}

	if (asyncCallback){
		stream.data ? readChunk() : asyncCallback(output);
	} else {
		while(stream.data){
			readChunk();
		}
	}
	return output;
}

PCMData.encode	= function(data, asyncCallback){
	var	
		dWord		= Binary.fromUint32,
		sWord		= Binary.fromUint16,
		samples		= data.data,
		sampleRate	= data.sampleRate,
		format 		= data.format || 1,
		channelCount	= data.channelCount || 1,
		bytesPerSample	= data.bytesPerSample || 1,
		bitsPerSample	= bytesPerSample * 8,
		blockAlign	= channelCount * bytesPerSample,
		byteRate	= sampleRate * blockAlign,
		length		= samples.length,
		dLength		= length * bytesPerSample,
		padding		= Math.pow(2, bitsPerSample - 1) - 1,
		chunks		= [],
		chunk		= '',
		chunkType,
		i, n, chunkData;

		
		chunks.push(
			'fmt '				+	// sGroupID		4 bytes		char[4]
			dWord(16)			+	// dwChunkSize		4 bytes		uint32 / dword
			sWord(format)			+	// wFormatTag		2 bytes		uint16 / ushort
			sWord(channelCount)		+	// wChannels		2 bytes		uint16 / ushort
			dWord(sampleRate)		+	// dwSamplesPerSec	4 bytes		uint32 / dword
			dWord(byteRate)			+	// dwAvgBytesPerSec	4 bytes		uint32 / dword
			sWord(blockAlign)		+	// wBlockAlign		2 bytes		uint16 / ushort
			sWord(bitsPerSample)			// dwBitsPerSample	2 or 4 bytes	uint32 / dword OR uint16 / ushort
		);

		chunks.push(
			'data'				+	// sGroupID		4 bytes		char[4]
			dWord(dLength)			+	// dwChunkSize		4 bytes		uint32 / dword
			PCMData.encodeFrame(samples, bitsPerSample)
		);
		chunkData = data.chunks;
		if (chunkData){
			for (i in chunkData){
				if (chunkData.hasOwnProperty(i)){
					chunkType = chunkData[i];
					for (n=0; n<chunkType.length; n++){
						chunk = chunkType[n];
						chunks.push(i + dWord(chunk.length) + chunk);
					}
				}
			}
		}
		chunks = chunks.join('');
		chunks = 'RIFF'			+	// sGroupId		4 bytes		char[4]
			dWord(chunks.length)	+	// dwFileLength		4 bytes		uint32 / dword
			'WAVE'			+	// sRiffType		4 bytes		char[4]
			chunks;
		asyncCallback && setTimeout(function(){
			asyncCallback(chunks);
		}, 1);
		return chunks;
}

return PCMData;

}(this.Binary, this.Stream));
/*!
 * g711
 * Copyright(c) 2011 João Martins <madjackoo@gmail.com>
 * MIT Licensed
 */
(function (exports) {
   
var G711 = {};

G711.BIAS = 0x84;
G711.CLIP = 32635;

G711.tables = {
    
    ulaw : {
        compress: [
          0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
          4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
          5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
          5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
          6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
          6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
          6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
          6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7
        ],

        decompress: [
          -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
          -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
          -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
          -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
          -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
          -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
          -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
          -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
          -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
          -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
          -876, -844, -812, -780, -748, -716, -684, -652,
          -620, -588, -556, -524, -492, -460, -428, -396,
          -372, -356, -340, -324, -308, -292, -276, -260,
          -244, -228, -212, -196, -180, -164, -148, -132,
          -120, -112, -104, -96, -88, -80, -72, -64,
          -56, -48, -40, -32, -24, -16, -8, 0,
          32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
          23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
          15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
          11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
          7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
          5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
          3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
          2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
          1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
          1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
          876, 844, 812, 780, 748, 716, 684, 652,
          620, 588, 556, 524, 492, 460, 428, 396,
          372, 356, 340, 324, 308, 292, 276, 260,
          244, 228, 212, 196, 180, 164, 148, 132,
          120, 112, 104, 96, 88, 80, 72, 64,
          56, 48, 40, 32, 24, 16, 8, 0    
        ],
    },

    alaw: {
        compress : [
            1, 1, 2, 2, 3, 3, 3, 3,
            4, 4, 4, 4, 4, 4, 4, 4,
            5, 5, 5, 5, 5, 5, 5, 5,
            5, 5, 5, 5, 5, 5, 5, 5,
            6, 6, 6, 6, 6, 6, 6, 6,
            6, 6, 6, 6, 6, 6, 6, 6,
            6, 6, 6, 6, 6, 6, 6, 6,
            6, 6, 6, 6, 6, 6, 6, 6,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7  
        ], 

        decompress: [
            -5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736,
            -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784,
            -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368,
            -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392,
            -22016, -20992, -24064, -23040, -17920, -16896, -19968, -18944,
            -30208, -29184, -32256, -31232, -26112, -25088, -28160, -27136,
            -11008, -10496, -12032, -11520, -8960, -8448, -9984, -9472,
            -15104, -14592, -16128, -15616, -13056, -12544, -14080, -13568,
            -344, -328, -376, -360, -280, -264, -312, -296,
            -472, -456, -504, -488, -408, -392, -440, -424,
            -88, -72, -120, -104, -24, -8, -56, -40,
            -216, -200, -248, -232, -152, -136, -184, -168,
            -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184,
            -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696,
            -688, -656, -752, -720, -560, -528, -624, -592,
            -944, -912, -1008, -976, -816, -784, -880, -848,
            5504, 5248, 6016, 5760, 4480, 4224, 4992, 4736,
            7552, 7296, 8064, 7808, 6528, 6272, 7040, 6784,
            2752, 2624, 3008, 2880, 2240, 2112, 2496, 2368,
            3776, 3648, 4032, 3904, 3264, 3136, 3520, 3392,
            22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944,
            30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136,
            11008, 10496, 12032, 11520, 8960, 8448, 9984, 9472,
            15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568,
            344, 328, 376, 360, 280, 264, 312, 296,
            472, 456, 504, 488, 408, 392, 440, 424,
            88, 72, 120, 104, 24, 8, 56, 40,
            216, 200, 248, 232, 152, 136, 184, 168,
            1376, 1312, 1504, 1440, 1120, 1056, 1248, 1184,
            1888, 1824, 2016, 1952, 1632, 1568, 1760, 1696,
            688, 656, 752, 720, 560, 528, 624, 592,
            944, 912, 1008, 976, 816, 784, 880, 848
        ]
    }
}

/**
  * Encode 
  */
G711.encode = function (samples, options) {
    options = options || {};

    var buffer = new ArrayBuffer(samples.byteLength/2)
      , encoded = new Int8Array(buffer)
      , mode = options.alaw ? 'alaw' : 'ulaw'
      , enc_func = G711[mode];

    for (var i = 0; i < samples.byteLength/2; i++) {  
    	encoded[i] = enc_func(samples[i]);
    }    

    return encoded;
};

G711.decode = function (encoded, options) {
    options = options || {};

    var floating_point = !!options["floating_point"]
      , buffer = new ArrayBuffer(encoded.byteLength * (!floating_point ? 2 : 4))
      , decoded = !floating_point ? new Int16Array(buffer) : new Float32Array(buffer)
      , dec_func = G711[(options.alaw ? 'alaw' : 'ulaw')+"_dec"]
      , tmp;

    for (var i = 0; i < encoded.byteLength; i++) {
        tmp = dec_func(encoded[i]);
        decoded[i] = (floating_point ? tmp / 32768 : tmp);
    }

    return decoded;
}

G711.alaw = function (sample) {
    var sbuffer = new ArrayBuffer(2)
    , bbuffer = new ArrayBuffer(1)

    , _short = new Int16Array(sbuffer)
    , _byte = new Int8Array(bbuffer);

    var sign, exponent, mantissa, s;

    sign = ((~sample) >> 8) & 0x80;
    if (!(sign == 0x80)) {
      _short[0] = -sample;
      sample = _short[0];
    }

    if (sample > G711.CLIP) {
      sample = G711.CLIP;
    }

    if (sample >= 256) {
      exponent = G711.tables.alaw.compress[(sample >> 8) & 0x7F];
      mantissa = (sample >> (exponent + 3)) & 0x0F;
      _byte[0] = (exponent << 4) | mantissa;
    } else {
      _byte[0] = sample >> 4;
    }

    _byte[0] ^= (sign ^ 0x55);
    return _byte[0];  
};

G711.alaw_dec = function (u_val) {
  var buffer = new ArrayBuffer(2)
    , _short = new Int8Array(buffer);


  var s = G711.tables.alaw.decompress[u_val & 0xff];
  _short[0] = s;
  _short[1] = (s >> 8);
  return new Int16Array(_short.buffer)[0];
};

G711.ulaw = function (pcm_val) {
    var sbuffer = new ArrayBuffer(2)
    , bbuffer = new ArrayBuffer(1)

    , _short = new Int16Array(sbuffer)
    , _byte = new Int8Array(bbuffer);

    var mask;
    var seg;
    var uval;

    /* Get the sign and the magnitude of the value, and add bias */
    if (pcm_val < 0) {
      _short[0] = (G711.BIAS - pcm_val);
      pcm_val = _short[0];
      mask = 0x7F;
    } else {
      pcm_val += G711.BIAS;
      mask = 0xFF;
    }

    /* Fetch Segment */
    var seg = G711.tables.ulaw.compress[(pcm_val >> 8) & 0x7F];

    /*
    * Combine the sign, segment, quantization bits;
    * and complement the code word.
    */
    if (seg >= 8) /* out of range, return maximum value. */ {
      return (0x7F ^ mask);
    } else {
      _byte[0] = ((seg << 4) | ((pcm_val >> (seg + 3)) & 0xF));      
      return  (_byte[0] ^ mask);
    }
}

G711.ulaw_dec = function (u_val) {
    var buffer = new ArrayBuffer(2)
    , _short = new Int8Array(buffer);


    var s = G711.tables.ulaw.decompress[u_val & 0xff];
    _short[0] = s;
    _short[1] = (s >> 8);
    return new Int16Array(_short.buffer)[0];
};

G711.ulaw_dec_slow = function (u_val) {
    var bbuffer = new ArrayBuffer(2)
    , _byte = new Int16Array(bbuffer);

    _byte[0] = ~u_val;

    /* Complement to obtain normal u-law value. */
    u_val = _byte[0];

    /*
    * Extract and bias the quantization bits. Then
    * shift up by the segment number and subtract out the bias.
    */
    t = ((u_val & 0xf) << 3) + G711.BIAS;
    t <<= (u_val & 0x70) >> 4;

    var s = (u_val & 0x80) == 0x80;
    
    var buffer = new ArrayBuffer(2)
    , shrt = new Int16Array(buffer);

    shrt[0] = (s ? (G711.BIAS - t) : (t - G711.BIAS));
    return shrt[0];
};

/**
  * Library version.
  */  
exports.G711 = G711;
exports.version = '0.0.1';


}(typeof(exports) !== "undefined" ? module.exports : this));