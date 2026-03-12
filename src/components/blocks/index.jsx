// blocks/index.jsx - Re-export hub for all display-side block components
// v2.9.27: Decomposed from 3,832-line monolith into individual component files

// Block component imports (needed for blockComponents registry)
import { TitleBlock } from './TitleBlock';
import { LocationBlock } from './LocationBlock';
import { ImageBlock } from './ImageBlock';
import { GalleryBlock } from './GalleryBlock';
import { SectionBlock } from './SectionBlock';
import { TextBlock } from './TextBlock';
import { ContactBlock } from './ContactBlock';
import { LinksBlock } from './LinksBlock';
import { TableBlock } from './TableBlock';
import { DateTagBlock } from './DateTagBlock';
import { TimerBlock } from './TimerBlock';
import { PollBlock } from './PollBlock';
import { AudioBlock } from './AudioBlock';
import { RatingBlock } from './RatingBlock';
import { SplitBlock } from './SplitBlock';
import { LeaderboardBlock } from './LeaderboardBlock';
import { DistributionBlock } from './DistributionBlock';
import TiebreakerBlock from './TiebreakerBlock';
import { ColorBlock } from './ColorBlock';
import { QuizBlock } from './QuizBlock';

// Re-export all components
export { TitleBlock, LocationBlock, ImageBlock, GalleryBlock, SectionBlock, TextBlock, ContactBlock, LinksBlock, TableBlock, DateTagBlock, TimerBlock, PollBlock, AudioBlock, RatingBlock, SplitBlock, LeaderboardBlock, DistributionBlock, TiebreakerBlock, ColorBlock, QuizBlock };

// Shared constants and utilities
export { TABLE_TEMPLATES } from './tableTemplates';
export { renderMarkdown } from './renderMarkdown';

// Block component registry - maps block type strings to display components
export const blockComponents = {
  title: TitleBlock,
  location: LocationBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  section: SectionBlock,
  text: TextBlock,
  contact: ContactBlock,
  links: LinksBlock,
  table: TableBlock,
  datetag: DateTagBlock,
  timer: TimerBlock,
  poll: PollBlock,
  audio: AudioBlock,
  rating: RatingBlock,
  split: SplitBlock,
  leaderboard: LeaderboardBlock,
  distribution: DistributionBlock,
  tiebreaker: TiebreakerBlock,
  color: ColorBlock,
  quiz: QuizBlock
};
