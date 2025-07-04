import {Howl} from 'howler';

const MUSIC_TRACKS = [
	"dill.opus",
	"celebration.opus",
	"funky_boxstep.opus",
	"loopster.opus",
	"shaving_mirror.opus"
	//"groove-loop.opus"
];

export type SoundEffectType = "submit" | "timer_tick" | "timer_end" | "score" | "victory";

class SoundInstance
{
	private _musicTrack: Howl;
	private _musicTrackId: number | undefined = undefined;
	private _soundEffects: { [sfx in SoundEffectType]: Howl };

	private _musicVolume: number = 0.15;
	private _sfxVolume: number = 0.5;

	musicPlay()
	{
		if (this._musicTrackId === undefined)
		{
			this._musicTrackId = this._musicTrack.play(this._musicTrackId);
			this._musicTrack.fade(0, this._musicVolume, 2000, this._musicTrackId);
		} else if (this._musicTrack.volume() < this._musicVolume)
		{
			this._musicTrack.fade(this._musicTrack.volume(), this._musicVolume, 500, this._musicTrackId);
		}
	}

	musicStop()
	{
		if (this._musicTrackId !== undefined)
		{
			this._musicTrack.fade(this._musicVolume, 0, 500, this._musicTrackId);
		}
	}

	sfxPlay(sound: SoundEffectType)
	{
		this._soundEffects[sound].play();
	}

	constructor()
	{
		this._musicTrack = new Howl({
			src: ["audio/music/" + MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)]],
			html5: true,
			loop: true,
			volume: this._musicVolume
		});

		this._soundEffects = {
			"submit": this.loadSfx("blip.opus"),
			"score": this.loadSfx("score.opus"),
			"victory": this.loadSfx("victory.opus"),
			"timer_tick": this.loadSfx("honk.opus"),
			"timer_end": this.loadSfx("ding.opus")
		};
	}

	private loadSfx(file: string): Howl
	{
		return new Howl({
			src: ["audio/sfx/" + file],
			preload: true,
			volume: this._sfxVolume
		});
	}
}

export default class Sound {
	private static _instance: SoundInstance | undefined = undefined;

	static initialize()
	{
		if (this._instance === undefined)
		{
			this._instance = new SoundInstance();
		}
	}

	static musicPlay()
	{
		if (this._instance !== undefined)
		{
			this._instance.musicPlay();
		}
	}

	static musicStop()
	{
		if (this._instance !== undefined)
		{
			this._instance.musicStop();
		}
	}

	static sfxPlay(sound: SoundEffectType)
	{
		if (this._instance !== undefined)
		{
			this._instance.sfxPlay(sound);
		}
	}
}