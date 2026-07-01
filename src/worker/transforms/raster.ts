import {
  convertIndexedToRgb,
  decode,
  encode,
  type DecodedPng,
  type ImageData,
} from "fast-png";
import type { SourceTransform } from "../sources";
import { HttpError } from "../utils/http";

const MAX_TRANSFORM_BYTES = 2_000_000;

function hasTransform(
  transforms: readonly SourceTransform[] | undefined,
  kind: SourceTransform["kind"],
): boolean {
  return Boolean(transforms?.some((transform) => transform.kind === kind));
}

function assertTransformablePng(upstream: Response): void {
  const contentType = upstream.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("image/png")) {
    throw new HttpError(502, "Raster transform requires PNG upstream tiles");
  }

  const contentLength = Number(upstream.headers.get("Content-Length") || 0);
  if (contentLength > MAX_TRANSFORM_BYTES) {
    throw new HttpError(502, "Raster tile is too large to transform");
  }
}

function imageDataForTransform(image: DecodedPng): ImageData {
  if (!image.palette) {
    return image;
  }

  const channels = image.palette[0]?.length;
  if (channels !== 3 && channels !== 4) {
    throw new HttpError(502, "Unsupported PNG palette layout");
  }

  return {
    width: image.width,
    height: image.height,
    data: convertIndexedToRgb(image),
    depth: 8,
    channels,
    text: image.text,
  };
}

function invertPngImageData(image: ImageData): ImageData {
  const data = image.data.slice();
  const depth = image.depth ?? 8;
  const channels = image.channels ?? 4;
  const maxValue = depth === 16 ? 65535 : 255;
  const colorChannels = channels === 2 || channels === 4
    ? channels - 1
    : channels;

  if (colorChannels < 1 || colorChannels > 3) {
    throw new HttpError(502, "Unsupported PNG channel layout");
  }

  for (let index = 0; index < data.length; index += channels) {
    for (let channel = 0; channel < colorChannels; channel += 1) {
      data[index + channel] = maxValue - data[index + channel];
    }
  }

  return {
    width: image.width,
    height: image.height,
    data,
    depth,
    channels,
    text: image.text,
  };
}

export async function transformRasterResponse(
  upstream: Response,
  transforms: readonly SourceTransform[] | undefined,
): Promise<ArrayBuffer | null> {
  if (!hasTransform(transforms, "invert-raster")) {
    return null;
  }

  assertTransformablePng(upstream);

  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_TRANSFORM_BYTES) {
    throw new HttpError(502, "Raster tile is too large to transform");
  }

  const decoded = decode(body);
  return bytesToArrayBuffer(encode(invertPngImageData(imageDataForTransform(decoded))));
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
