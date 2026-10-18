import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_MB, UploadError, loadPhoto } from './upload';

const file = (name: string, type: string, bytes = 10) => new File([new Uint8Array(bytes)], name, { type });

function stubDecode(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close })));
  return close;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPhoto', () => {
  it('rejects no file and more than one file', async () => {
    await expect(loadPhoto([])).rejects.toThrow(UploadError);
    await expect(loadPhoto([file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')])).rejects.toThrow(/one photo at a time/);
  });

  it('explains that HEIC photos need converting', async () => {
    await expect(loadPhoto([file('IMG_0001.HEIC', 'image/heic')])).rejects.toThrow(/HEIC/);
  });

  it('rejects unsupported formats', async () => {
    await expect(loadPhoto([file('a.gif', 'image/gif')])).rejects.toThrow(/JPEG, PNG or WebP/);
  });

  it(`rejects files over ${MAX_FILE_MB} MB`, async () => {
    await expect(loadPhoto([file('big.jpg', 'image/jpeg', (MAX_FILE_MB + 1) * 1024 * 1024)])).rejects.toThrow(/limit is 20 MB/);
  });

  it('rejects images over the megapixel limit and frees them', async () => {
    const close = stubDecode(20000, 10000);
    await expect(loadPhoto([file('huge.jpg', 'image/jpeg')])).rejects.toThrow(/megapixels/);
    expect(close).toHaveBeenCalled();
  });

  it('reports a file that cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('bad data'))));
    await expect(loadPhoto([file('broken.jpg', 'image/jpeg')])).rejects.toThrow(/opened as an image/);
  });

  it('accepts a normal photo and warns when it is small', async () => {
    stubDecode(4000, 3000);
    expect((await loadPhoto([file('ok.jpg', 'image/jpeg')])).warnings).toEqual([]);
    stubDecode(400, 500);
    expect((await loadPhoto([file('small.png', 'image/png')])).warnings[0]).toMatch(/Low resolution/);
  });
});
