import crypto from 'crypto';

export function generateAcceptValue(acceptKey) {
    return crypto
        .createHash('sha1')
        .update(acceptKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", 'binary')
        .digest('base64');
}

export function unmask(payload, maskingKey) {
    const result = Buffer.alloc(payload.byteLength);
    for (let i = 0; i < payload.byteLength; ++i) {
        const j = i % 4;
        const maskingKeyByteShift = j === 3 ? 0 : (3 - j) << 3;
        const maskingKeyByte = (maskingKeyByteShift === 0 ? maskingKey : maskingKey >>> maskingKeyByteShift) & 0b11111111;
        const transformedByte = maskingKeyByte ^ payload.readUInt8(i);
        result.writeUInt8(transformedByte, i);
    }

    return result;
}

export function createFrame(data) {
    const payload = JSON.stringify(data);

    const payloadByteLength = Buffer.byteLength(payload);
    let payloadBytesOffset = 2;
    let payloadLength = payloadByteLength;

    if (payloadByteLength > 65535) { // length value cannot fit in 2 bytes
        payloadBytesOffset += 8;
        payloadLength = 127;
    } else if (payloadByteLength > 125) {
        payloadBytesOffset += 2;
        payloadLength = 126;
    }

    const buffer = Buffer.alloc(payloadBytesOffset + payloadByteLength);

    // first byte
    buffer.writeUInt8(0b10000001, 0); // [FIN (1), RSV1 (0), RSV2 (0), RSV3 (0), Opode (0x01 - text frame)]

    buffer[1] = payloadLength; // second byte - actual payload size (if <= 125 bytes) or 126, or 127

    if (payloadLength === 126) { // write actual payload length as a 16-bit unsigned integer
        buffer.writeUInt16BE(payloadByteLength, 2);
    } else if (payloadByteLength === 127) { // write actual payload length as a 64-bit unsigned integer
        buffer.writeBigUInt64BE(BigInt(payloadByteLength), 2);
    }

    buffer.write(payload, payloadBytesOffset);
    return buffer;
}



export function parseFrame(buffer) {
    const firstByte = buffer.readUInt8(0);
    const opCode = firstByte & 0b00001111; // get last 4 bits of a byte

    if (opCode === 0x08) { //opcode close
        this.emit('close');
        return null;
    } else if (opCode !== 0x01) { //opcode text
        return;
    }

    const secondByte = buffer.readUInt8(1); // start with a payload length

    let offset = 2;
    let payloadLength = secondByte & 0b01111111; // get last 7 bits of a second byte

    if (payloadLength === 126) {
        offset += 2;
    } else if (payloadLength === 127) {
        offset += 8;
    }

    const isMasked = Boolean((secondByte >>> 7) & 0x1); // get first bit of a second byte

    if (isMasked) {
        const maskingKey = buffer.readUInt32BE(offset); // read 4-byte mask
        offset += 4;
        const payload = buffer.subarray(offset);
        const result = unmask(payload, maskingKey);
        return result.toString('utf-8');
    }

    return buffer.subarray(offset).toString('utf-8');
}
