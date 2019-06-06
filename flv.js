// Generated by CoffeeScript 2.4.1
(function() {
  var Bits, aac, api, h264, logger;

  h264 = require('./h264');

  aac = require('./aac');

  Bits = require('./bits');

  logger = require('./logger');

  api = {
    SOUND_FORMAT_AAC: 10, // AAC
    SOUND_RATE_5KHZ: 0, // 5.5 kHz
    SOUND_RATE_11KHZ: 1, // 11 kHz
    SOUND_RATE_22KHZ: 2, // 22 kHz
    SOUND_RATE_44KHZ: 3, // 44 kHz
    
    // SoundSize for compressed audio is 1 (16-bit)
    SOUND_SIZE_COMPRESSED: 1,
    SOUND_TYPE_MONO: 0,
    SOUND_TYPE_STEREO: 1,
    AAC_PACKET_TYPE_SEQUENCE_HEADER: 0, // AAC sequence header
    AAC_PACKET_TYPE_RAW: 1, // AAC raw
    AVC_PACKET_TYPE_SEQUENCE_HEADER: 0, // AVC sequence header
    AVC_PACKET_TYPE_NALU: 1, // AVC NALU
    AVC_PACKET_TYPE_EOS: 2, // AVC end of sequence
    getSoundType: function(channels) {
      if (channels > 1) { // stereo
        return 1; // mono
      } else {
        return 0;
      }
    },
    getSoundSize: function(numBits) {
      switch (numBits) {
        case 8:
          return 0;
        case 16:
          return 1;
        default:
          throw new Error(`Invalid number of bits in a sample: ${numBits}`);
      }
    },
    getSampleRateFromSoundRate: function(soundRate) {
      switch (soundRate) {
        case 0:
          return 5512;
        case 1:
          return 11025;
        case 2:
          return 22050;
        case 3:
          return 44100;
        default:
          throw new Error(`Invalid SoundRate: ${soundRate}`);
      }
    },
    // @param  sampleRate (number) sample rate in Hz
    // @return  (number) sound rate
    getSoundRate: function(sampleRate) {
      switch (parseInt(sampleRate)) {
        case 5512:
          return 0;
        case 11025:
          return 1;
        case 22050:
          return 2;
        case 44100:
          return 3;
        default:
          throw new Error(`Sample rate is not supported by FLV: ${sampleRate}`);
      }
    },
    // @param  opts (object) {
    //   aacPacketType: flv.AAC_PACKET_TYPE_SEQUENCE_HEADER or
    //                  flv.AAC_PACKET_TYPE_RAW
    // }
    // @return  array
    createAACAudioDataTag: function(opts) {
      return api.createAudioDataTag({
        soundFormat: api.SOUND_FORMAT_AAC,
        soundRate: api.SOUND_RATE_44KHZ, // ignored by Flash Player
        soundSize: api.SOUND_SIZE_COMPRESSED,
        soundType: api.SOUND_TYPE_STEREO, // ignored by Flash Player
        aacPacketType: opts.aacPacketType
      });
    },
    videoCodecID2Str: function(codecID) {
      switch (codecID) {
        case 2:
          return "Sorenson H.263";
        case 3:
          return "Screen video";
        case 4:
          return "On2 VP6";
        case 5:
          return "On2 VP6 with alpha channel";
        case 6:
          return "Screen video version 2";
        case 7:
          return "AVC";
        default:
          return "unknown";
      }
    },
    parseVideo: function(buf) {
      var bits, info;
      info = {};
      bits = new Bits(buf);
      info.videoDataTag = api.readVideoDataTag(bits);
      // Reject if the codec is not H.264
      if (info.videoDataTag.codecID !== 7) {
        throw new Error(`flv: Video codec ID ${info.videoDataTag.codecID} ` + `(${api.videoCodecID2Str(info.videoDataTag.codecID)}) is not supported. Use H.264.`);
      }
      switch (info.videoDataTag.avcPacketType) {
        case api.AVC_PACKET_TYPE_SEQUENCE_HEADER:
          info.avcDecoderConfigurationRecord = h264.readAVCDecoderConfigurationRecord(bits);
          break;
        case api.AVC_PACKET_TYPE_NALU:
          info.nalUnits = bits.remaining_buffer();
          break;
        case api.AVC_PACKET_TYPE_EOS:
          break;
        default:
          throw new Error(`flv: unknown AVCPacketType: ${info.videoDataTag.avcPacketType}`);
      }
      return info;
    },
    splitNALUnits: function(buf, nalUnitLengthSize) {
      var bits, nalUnitLen, nalUnits;
      bits = new Bits(buf);
      nalUnits = [];
      while (bits.has_more_data()) {
        nalUnitLen = bits.read_bits(nalUnitLengthSize * 8);
        nalUnits.push(bits.read_bytes(nalUnitLen));
      }
      return nalUnits;
    },
    soundFormat2Str: function(soundFormat) {
      switch (soundFormat) {
        case 0:
          return "Linear PCM, platform endian";
        case 1:
          return "ADPCM";
        case 2:
          return "MP3";
        case 3:
          return "Linear PCM, little endian";
        case 4:
          return "Nellymoser 16 kHz mono";
        case 5:
          return "Nellymoser 8 kHz mono";
        case 6:
          return "Nellymoser";
        case 7:
          return "G.711 A-law logarithmic PCM";
        case 8:
          return "G.711 mu-law logarithmic PCM";
        case 9:
          return "reserved";
        case 10:
          return "AAC";
        case 11:
          return "Speex";
        case 14:
          return "MP3 8 kHz";
        case 15:
          return "Device-specific sound";
        default:
          return "unknown";
      }
    },
    parseAudio: function(buf) {
      var bits, info;
      info = {};
      bits = new Bits(buf);
      info.audioDataTag = api.readAudioDataTag(bits);
      // Reject if the sound format is not AAC
      if (info.audioDataTag.soundFormat !== api.SOUND_FORMAT_AAC) {
        throw new Error(`flv: Sound format ${info.audioDataTag.soundFormat} ` + `(${api.soundFormat2Str(info.audioDataTag.soundFormat)}) is not supported. Use AAC.`);
      }
      switch (info.audioDataTag.aacPacketType) {
        case api.AAC_PACKET_TYPE_SEQUENCE_HEADER:
          if (bits.has_more_data()) {
            bits.mark();
            info.ascInfo = aac.readAudioSpecificConfig(bits);
            info.audioSpecificConfig = bits.marked_bytes();
          } else {
            logger.warn("flv:parseAudio(): warn: AAC sequence header does not contain AudioSpecificConfig");
          }
          break;
        case api.AAC_PACKET_TYPE_RAW:
          info.rawDataBlock = bits.remaining_buffer();
          break;
        default:
          throw new Error(`flv: unknown AACPacketType: ${info.audioDataTag.aacPacketType}`);
      }
      return info;
    },
    // E.4.3.1 VIDEODATA
    readVideoDataTag: function(bits) {
      var info;
      info = {};
      info.frameType = bits.read_bits(4);
      info.codecID = bits.read_bits(4);
      if (info.codecID === 7) {
        info.avcPacketType = bits.read_byte();
        info.compositionTime = bits.read_bits(24);
      }
      //      if (info.avcPacketType isnt 1) and (info.compositionTime isnt 0)
      //        # TODO: Does this situation require special handling?
      //        logger.error "flv:readVideoDataTag(): AVCPacketType isn't 1 but CompositionTime isn't 0 (feature not implemented); AVCPacketType=#{info.avcPacketType} CompositionTime=#{info.compositionTime}"
      return info;
    },
    // E.4.2.1 AUDIODATA
    readAudioDataTag: function(bits) {
      var b, info;
      info = {};
      b = bits.read_byte();
      info.soundFormat = b >> 4;
      info.soundRate = (b >> 2) & 0b11;
      info.soundSize = (b >> 1) & 0b1;
      info.soundType = b & 0b1;
      if (info.soundFormat === api.SOUND_FORMAT_AAC) {
        info.aacPacketType = bits.read_byte();
      }
      return info;
    },
    // @param  opts (object) {
    //   soundFormat (int)
    //   soundRate (int)
    //   soundSize (int)
    //   soundType (int)
    //   aacPacketType (int) (optional): mandatory if soundFormat is AAC
    // }
    // @return array
    createAudioDataTag: function(opts) {
      var buf, soundRate, soundType;
      soundType = opts.soundType;
      soundRate = opts.soundRate;
      // If AAC, SoundType and SoundRate should be 1 (stereo) and 3 (44 kHz),
      // respectively. Flash Player ignores these values.
      if (opts.soundFormat === api.SOUND_FORMAT_AAC) {
        soundType = 1;
        soundRate = api.SOUND_RATE_44KHZ;
      }
      // AUDIODATA tag: Adobe's Video File Format Spec v10.1 E.4.2.1 AUDIODATA
      buf = [(opts.soundFormat << 4) | (soundRate << 2) | (opts.soundSize << 1) | soundType]; // SoundFormat (4 bits) // SoundRate (2 bits): ignored by Flash Player if AAC // SoundSize (1 bit) // SoundType (1 bit): ignored by Flash Player if AAC
      if (opts.soundFormat === api.SOUND_FORMAT_AAC) {
        buf.push(opts.aacPacketType); // AACPacketType (1 bit)
      }
      return buf;
    },
    // Convert milliseconds into PTS (90 kHz clock)
    convertMsToPTS: function(ms) {
      return ms * 90;
    }
  };

  module.exports = api;

}).call(this);
