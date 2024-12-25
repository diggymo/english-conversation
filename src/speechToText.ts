import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"; // ES Modules import


export const play = async (text: string) => {

  const client = new PollyClient({
    region: "us-west-2",
      credentials: {
        accessKeyId: localStorage.getItem("accessKeyId") || "",
        secretAccessKey: localStorage.getItem("secretKey") || ""
      }
  });


  const res = await client.send(new SynthesizeSpeechCommand({
    Engine: "generative",
    LanguageCode: "en-US",
    OutputFormat: "mp3",
    VoiceId: (Math.random() > 0.5) ? "Danielle" : "Stephen",
    // Text: "The Bellagio is a classic Vegas casino. Their fountains are a must-see, and the casino floor is stunning. They have high-end dining, swanky bars, and exciting table games. I'd also recommend checking out the Venetian - you can gondola ride through the canals! Whichever you choose, we're sure to have a thrilling night. What do you think piques your interest the most?", // required
    Text: text,
    TextType:"text",
  }));
  
  const byteArray = await res.AudioStream?.transformToByteArray()!
  return byteArray
  // var blob = new Blob([stream], { type: 'audio/mp3' });
  // var url = window.URL.createObjectURL(blob)
  // element.src = url;
  // element.play();
}
