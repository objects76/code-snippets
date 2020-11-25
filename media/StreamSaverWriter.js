
// <script src="https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.min.js"></script>

export default function StreamSaverWriter(fileName) {
  let fr = new FileReader();
  let chunks = Promise.resolve();
  let fileStream = streamSaver.createWriteStream(fileName);
  let writer = fileStream.getWriter();

  this.close = function () {
	setTimeout(() => chunks.then((evt) => writer.close()), 1000);
  };

  this.write = function (blob) {
	chunks = chunks.then(
	  () =>
		new Promise((resolve) => {
		  fr.onload = () => {
			writer.write(new Uint8Array(fr.result));
			resolve();
		  };
		  fr.readAsArrayBuffer(blob);
		})
	);
  };
}

