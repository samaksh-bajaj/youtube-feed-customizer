import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TypeSafeClient, noul } from '@typesafe-ai/sdk';
import type { NoulQuestion } from '@typesafe-ai/sdk';
import type { ClassifyRequest, ClassifyResponse } from '../lib/api';
import { MAX_VIDEOS_PER_REQUEST, SECRET_HEADER } from '../lib/api';
import type { VideoMeta } from '../lib/types';

/**
 * Judges a batch of YouTube videos against the user's feed rule.
 *
 * The whole batch travels as one piece of state with one Noul per video, which
 * is the documented fan-out pattern: the rule is only serialised once and ten
 * videos cost one round trip instead of ten.
 *
 * Returns probabilities rather than hide/show decisions — the threshold belongs
 * to the extension, so it can be tuned without redeploying this.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const expectedSecret = process.env.JEV_SHARED_SECRET;
  if (!expectedSecret) {
    console.error('JEV_SHARED_SECRET is not set');
    return res.status(500).json({ error: 'Server is misconfigured' });
  }
  if (req.headers[SECRET_HEADER] !== expectedSecret) {
    return res.status(401).json({ error: 'Bad or missing secret' });
  }

  const body = req.body as Partial<ClassifyRequest> | undefined;
  const rule = typeof body?.rule === 'string' ? body.rule.trim() : '';
  const videos = Array.isArray(body?.videos) ? body.videos : [];

  if (!rule) {
    return res.status(400).json({ error: 'rule is required' });
  }
  if (videos.length === 0) {
    return res.status(400).json({ error: 'videos must not be empty' });
  }
  if (videos.length > MAX_VIDEOS_PER_REQUEST) {
    return res
      .status(400)
      .json({ error: `At most ${MAX_VIDEOS_PER_REQUEST} videos per request` });
  }

  const client = new TypeSafeClient();

  try {
    const { answers } = await client.systemOne({
      state: {
        rule,
        videos: videos.map((video) => ({
          title: video.title,
          channel: video.channel,
        })),
      },
      questions: buildQuestions(videos),
    });

    const scores: ClassifyResponse['scores'] = {};
    videos.forEach((video, index) => {
      scores[video.videoId] = answers[questionName(index)]!.noul;
    });

    return res.status(200).json({ scores } satisfies ClassifyResponse);
  } catch (error) {
    console.error('systemOne failed', error);
    return res.status(502).json({ error: 'Classification failed' });
  }
}

function questionName(index: number): string {
  return `v${index}`;
}

function buildQuestions(videos: VideoMeta[]): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {};

  videos.forEach((_, index) => {
    questions[questionName(index)] = noul(
      `The user's rule for their YouTube home feed is \`rule\`. Considering the video at \`videos[${index}]\`, should it be kept off their feed?`,
      {
        true:
          'The rule asks for videos like this one to be kept off the feed, or ' +
          'the rule describes the feed the user wants and this video clearly ' +
          'does not belong in it.',
        false:
          'The rule allows this video, or the rule says nothing that applies to it.',
      },
    );
  });

  return questions;
}
