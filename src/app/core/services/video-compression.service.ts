import { Injectable } from '@angular/core';
import { createFFmpeg, FFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { Subject, Observable } from 'rxjs';

export interface CompressionProgress {
    progress: number; // 0-100
    status: 'loading' | 'compressing' | 'complete' | 'error';
    message?: string;
}

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
}

@Injectable({
    providedIn: 'root'
})
export class VideoCompressionService {
    private ffmpeg: FFmpeg | null = null;
    private isLoaded = false;
    private loadingPromise: Promise<void> | null = null;

    constructor() { }

    /**
     * Compress video in background and return Observable for progress tracking
     */
    compressVideoAsync(file: File, options?: {
        crf?: number;
        maxWidth?: number;
        format?: 'mp4' | 'mov';
    }): Observable<{ progress: CompressionProgress, result?: CompressionResult }> {
        const subject = new Subject<{ progress: CompressionProgress, result?: CompressionResult }>();

        // Start compression in a separate execution context
        setTimeout(async () => {
            try {
                const originalSize = file.size;

                // Notify loading FFmpeg
                subject.next({
                    progress: { progress: 0, status: 'loading', message: 'Cargando compresor...' }
                });

                await this.loadFFmpeg();

                // Notify compression started
                subject.next({
                    progress: { progress: 10, status: 'compressing', message: 'Comprimiendo video...' }
                });

                const compressedFile = await this.compressVideo(file, options);
                const compressedSize = compressedFile.size;
                const reduction = Math.round((1 - compressedSize / originalSize) * 100);

                // Notify completion
                subject.next({
                    progress: { progress: 100, status: 'complete', message: 'Compresión completada' },
                    result: {
                        file: compressedFile,
                        originalSize,
                        compressedSize,
                        reductionPercent: reduction
                    }
                });

                subject.complete();

            } catch (error) {
                console.error('[VIDEO_COMPRESSION_ASYNC] Error:', error);
                subject.next({
                    progress: {
                        progress: 0,
                        status: 'error',
                        message: error instanceof Error ? error.message : 'Error desconocido'
                    }
                });
                subject.error(error);
            }
        }, 0);

        return subject.asObservable();
    }

    private async loadFFmpeg(): Promise<void> {
        if (this.isLoaded && this.ffmpeg) {
            return;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {
            try {
                console.log('[VIDEO_COMPRESSION] Initializing FFmpeg...');
                this.ffmpeg = createFFmpeg({
                    log: true,
                    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
                });

                await this.ffmpeg.load();
                this.isLoaded = true;
                console.log('[VIDEO_COMPRESSION] FFmpeg loaded successfully');
            } catch (error) {
                console.error('[VIDEO_COMPRESSION] Failed to load FFmpeg:', error);
                this.loadingPromise = null;
                throw error;
            }
        })();

        return this.loadingPromise;
    }

    private async compressVideo(file: File, options?: {
        crf?: number;
        maxWidth?: number;
        format?: 'mp4' | 'mov';
    }): Promise<File> {
        console.log('[VIDEO_COMPRESSION] Starting compression for:', file.name);
        console.log('[VIDEO_COMPRESSION] Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

        if (!this.ffmpeg || !this.isLoaded) {
            throw new Error('FFmpeg not loaded');
        }

        const crf = options?.crf ?? 32;
        const maxWidth = options?.maxWidth ?? 720; // 720p por defecto para velocidad
        const format = options?.format ?? 'mp4';

        const inputName = 'input' + this.getFileExtension(file.name);
        const outputName = 'output.' + format;

        try {
            // Write input file to FFmpeg virtual filesystem
            this.ffmpeg.FS('writeFile', inputName, await fetchFile(file));

            // Run compression with faster settings
            const args = [
                '-i', inputName,
                '-vcodec', 'libx264',
                '-crf', crf.toString(),
                '-preset', 'ultrafast',
                '-tune', 'fastdecode',
                '-vf', `scale='min(${maxWidth},iw)':-2`,
                '-acodec', 'aac',
                '-b:a', '96k',
                '-movflags', '+faststart',
                '-threads', '0',
            ];

            if (format === 'mov') {
                args.push('-f', 'mov');
            }

            args.push(outputName);

            console.log('[VIDEO_COMPRESSION] FFmpeg args:', args.join(' '));

            await this.ffmpeg.run(...args);

            // Read output file
            const data = this.ffmpeg.FS('readFile', outputName);

            // Clean up
            this.ffmpeg.FS('unlink', inputName);
            this.ffmpeg.FS('unlink', outputName);

            // Create new File
            const compressedBlob = new Blob([data.buffer as ArrayBuffer], {
                type: format === 'mp4' ? 'video/mp4' : 'video/quicktime'
            });

            const compressedFile = new File(
                [compressedBlob],
                file.name.replace(/\.\w+$/, '.' + format),
                { type: compressedBlob.type }
            );

            console.log('[VIDEO_COMPRESSION] Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
            console.log('[VIDEO_COMPRESSION] Reduction:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');

            return compressedFile;

        } catch (error) {
            console.error('[VIDEO_COMPRESSION] Compression failed:', error);
            throw error;
        }
    }

    private getFileExtension(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext ? '.' + ext : '.mov';
    }

    getEstimatedTime(fileSizeMB: number): number {
        // Very rough estimate: ~2-3 seconds per MB with ultrafast preset
        return fileSizeMB * 2;
    }

    cleanup(): void {
        this.ffmpeg = null;
        this.isLoaded = false;
        this.loadingPromise = null;
    }
}
