// Import all specialized block editors
import { FullscreenTextEditor } from './blocks/FullscreenTextEditor';
import { TextBlockEditor } from './blocks/TextBlockEditor';
import { ContactBlockEditor } from './blocks/ContactBlockEditor';
import { LocationBlockEditor } from './blocks/LocationBlockEditor';
import { LinksBlockEditor } from './blocks/LinksBlockEditor';
import { TableBlockEditor } from './blocks/TableBlockEditor';
import { SectionBlockEditor } from './blocks/SectionBlockEditor';
import { GalleryBlockEditor } from './blocks/GalleryBlockEditor';
import { DateTagBlockEditor } from './blocks/DateTagBlockEditor';
import { TimerBlockEditor } from './blocks/TimerBlockEditor';
import { PollBlockEditor } from './blocks/PollBlockEditor';
import { AudioBlockEditor } from './blocks/AudioBlockEditor';
import { SplitBlockEditor } from './blocks/SplitBlockEditor';
import { LeaderboardBlockEditor } from './blocks/LeaderboardBlockEditor';
import { DistributionBlockEditor } from './blocks/DistributionBlockEditor';
import { TiebreakerBlockEditor } from './blocks/TiebreakerBlockEditor';
import { RatingBlockEditor } from './blocks/RatingBlockEditor';
import { ColorBlockEditor } from './blocks/ColorBlockEditor';

// Block type → editor component map
const EDITOR_MAP = {
  location: LocationBlockEditor,
  contact: ContactBlockEditor,
  links: LinksBlockEditor,
  table: TableBlockEditor,
  datetag: DateTagBlockEditor,
  gallery: GalleryBlockEditor,
  timer: TimerBlockEditor,
  poll: PollBlockEditor,
  audio: AudioBlockEditor,
  split: SplitBlockEditor,
  leaderboard: LeaderboardBlockEditor,
  distribution: DistributionBlockEditor,
  section: SectionBlockEditor,
  tiebreaker: TiebreakerBlockEditor,
  rating: RatingBlockEditor,
  color: ColorBlockEditor,
};

// Main block editor dispatcher
// Routes to the correct specialized editor based on block.type
// Falls back to TextBlockEditor for unknown types (text, notes, etc.)
function BlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, locationIndexOffset = 0, shares, currentUser, currentUserDisplayName, hideReorder }) {
  const Editor = EDITOR_MAP[block.type] || TextBlockEditor;

  return (
    <Editor
      block={block}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onMove={onMove}
      index={index}
      total={total}
      saving={saving}
      locationIndexOffset={locationIndexOffset}
      shares={shares}
      currentUser={currentUser}
      currentUserDisplayName={currentUserDisplayName}
      hideReorder={hideReorder}
    />
  );
}

// Re-export for consumers that need specific editors or FullscreenTextEditor
export {
  FullscreenTextEditor,
  TextBlockEditor,
  ContactBlockEditor,
  LocationBlockEditor,
  LinksBlockEditor,
  TableBlockEditor,
  SectionBlockEditor,
  GalleryBlockEditor,
  DateTagBlockEditor,
  TimerBlockEditor,
  PollBlockEditor,
  AudioBlockEditor,
  SplitBlockEditor,
  LeaderboardBlockEditor,
  DistributionBlockEditor,
  TiebreakerBlockEditor,
  RatingBlockEditor,
  ColorBlockEditor
};

export default BlockEditor;
