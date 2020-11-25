
import StreamSaverWriter from "StreamSaveWriter.js";


function StreamRecorder(stream, fileName) {
  console.log("stream in recorder:", stream);
  const options = {
	audioBitsPerSecond: 128 * 1000,
	videoBitsPerSecond: 1 * 1000 * 1000, // default 2.5M
	// mimeType: "video/webm",
	// mimeType: "video/mp4",
  };
  if (options.mimeType?.indexOf("/webm") > 0) fileName += ".webm";

  fileName = "detailed-" + fileName;
  stream = stream.clone();
  setVideoTrackContentHints(stream, "detailed");
  setVideoTrackContentHints(stream, "detail");
  options.audioBitsPerSecond = 64 * 1000;
  options.videoBitsPerSecond = 500 * 1000;

  const mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.addEventListener("pause", (ev) => log(ev.type));
  mediaRecorder.addEventListener("resume", (ev) => log(ev.type));
  mediaRecorder.addEventListener("start", (ev) => log(ev.type));
  mediaRecorder.addEventListener("stop", (ev) => log(ev.type));
  mediaRecorder.addEventListener("error", (ev) => log(ev.type, ev));

  let writer = new StreamSaverWriter(fileName);

  let recordedSecond = 0;
  mediaRecorder.ondataavailable = (evt) => {
	log(`blob length= ${evt.data.size}`);
	writer?.write(evt.data);
	if (++recordedSecond === 20) btnStop.click();
  };

  mediaRecorder.start(1000); // 1sec timeslice

  this.close = function () {
	if (!writer) return;
	log("stopRecording");
	for (const track of [...stream.getAudioTracks(), ...stream.getVideoTracks()]) track.stop();
	mediaRecorder.stop();
	writer.close();
	writer = undefined;
  };
}


function setVideoTrackContentHints(stream, hint) {
  const tracks = stream.getVideoTracks();
  tracks.forEach((track) => {
	if ("contentHint" in track) {
	  track.contentHint = hint;
	  if (track.contentHint !== hint) {
		console.log(`set ${hint}, but ${track.contentHint}`);
	  } else {
		console.log(`set ${hint}, and value is ${track.contentHint}`);
	  }
	} else {
	  console.log("MediaStreamTrack contentHint attribute not supported");
	}
  });
}