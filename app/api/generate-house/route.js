import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});

function safeName(value) {
 return String(value || "")
 .toLowerCase()
 .replace(/[^a-z0-9-_]+/g, "-")
 .replace(/-+/g, "-")
 .replace(/^-|-$/g, "");
}

function ensureFolder() {
 const folderPath = path.join(process.cwd(), "public", "houses", "generated");
 fs.mkdirSync(folderPath, { recursive: true });
 return folderPath;
}

function saveBase64Image(base64, fileName) {
 const folderPath = ensureFolder();
 const filePath = path.join(folderPath, fileName);
 const buffer = Buffer.from(base64, "base64");
 fs.writeFileSync(filePath, buffer);
 return `/houses/generated/${fileName}`;
}

async function generateSingleScheme(params) {
 const { basePrompt, quality, styleName, timestamp, schemeKey, schemePrompt } =
 params;

 const result = await client.images.generate({
 model: "gpt-image-1",
 prompt: `${basePrompt}

Scheme requirement:
${schemePrompt}
`,
 size: "1536x1024",
 quality,
 });

 const imageBase64 = result.data?.[0]?.b64_json;

 if (!imageBase64) {
 throw new Error(`No image returned for ${schemeKey}.`);
 }

 const fileName = `${styleName}-${quality}-${timestamp}-${schemeKey}.png`;
 return saveBase64Image(imageBase64, fileName);
}

export async function POST(request) {
 try {
 const {
 area,
 rooms,
 style,
 floors,
 houseType,
 facade,
 roof,
 roofColor,
 scene,
 tone,
 garage,
 season,
 plot,
 renderQuality,
 } = await request.json();

 const quality =
 renderQuality === "low" ||
 renderQuality === "medium" ||
 renderQuality === "high"
 ? renderQuality
 : "medium";

 const basePrompt = `
Create a high-quality, realistic architectural exterior rendering of a dream residential house.

Project requirements:
- Building area: ${area}
- Room count: ${rooms}
- Architectural style: ${style}
- Floors: ${floors}
- House type: ${houseType}
- Facade material: ${facade}
- Roof type: ${roof}
- Roof color: ${roofColor}
- Environment / site: ${scene}
- Plot / world location: ${plot}
- Tone preference: ${tone}
- Garage requirement: ${garage}
- Season / atmosphere: ${season}

Rendering goals:
- Create a premium architectural concept image in realistic visualization style.
- All images must be bird's-eye / aerial perspective views.
- Show the house together with roof design, surrounding landscape, driveway, paths, courtyard, and its relation to the site.
- Keep proportions realistic and composition clean.
- Focus on exterior massing, roof composition, site planning, facade language, and premium presentation quality.
- The house should naturally fit the selected environment, plot location, and season.
- Lighting, vegetation, terrain, sky, and ambient mood should match the selected season, plot, and tone preference.
- The final image should look like a polished architectural concept presentation or premium real-estate visualization.
- No text, watermark, labels, captions, or UI elements in the image.

Important:
- These are NOT different camera angles of the same exact shot requirement.
- Instead, create 4 different candidate architectural schemes based on the same project brief.
- Each scheme should remain consistent with the user's requirements, but differ in composition, massing emphasis, courtyard/landscape organization, facade rhythm, roof layout, or overall design interpretation.
- Every scheme must still be clearly believable, premium, and coherent.
`;

 const timestamp = Date.now();
 const styleName = safeName(style || "house");

 const scheme1 = await generateSingleScheme({
 basePrompt,
 quality,
 styleName,
 timestamp,
 schemeKey: "scheme1",
 schemePrompt:
 "Scheme 1: bird's-eye candidate design focused on balanced overall composition, elegant roof geometry, premium curb appeal, and clear main entrance organization.",
 });

 const scheme2 = await generateSingleScheme({
 basePrompt,
 quality,
 styleName,
 timestamp,
 schemeKey: "scheme2",
 schemePrompt:
 "Scheme 2: bird's-eye candidate design focused on stronger facade character, richer massing hierarchy, more dynamic site layout, and a more expressive architectural silhouette.",
 });

 const scheme3 = await generateSingleScheme({
 basePrompt,
 quality,
 styleName,
 timestamp,
 schemeKey: "scheme3",
 schemePrompt:
 "Scheme 3: bird's-eye candidate design focused on courtyard and landscape integration, outdoor living quality, circulation clarity, and harmonious relation between building and site.",
 });

 const scheme4 = await generateSingleScheme({
 basePrompt,
 quality,
 styleName,
 timestamp,
 schemeKey: "scheme4",
 schemePrompt:
 "Scheme 4: bird's-eye candidate design focused on a more luxurious premium presentation, stronger architectural statement, refined detailing, and visually impressive site composition.",
 });

 return Response.json({
 success: true,
 imageUrl: scheme1,
 views: {
 main: scheme1,
 side: scheme2,
 aerial: scheme3,
 night: scheme4,
 },
 fileName: `${styleName}-${quality}-${timestamp}`,
 quality,
 });
 } catch (error) {
 console.error("generate-house error:", error);

 return Response.json(
 {
 success: false,
 error: error?.message || "Failed to generate house image.",
 },
 { status: 500 }
 );
 }
}