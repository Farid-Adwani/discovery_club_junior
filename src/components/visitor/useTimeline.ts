import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TIMELINE } from '../../data/timeline';
import { applyTimelineEdits } from '../../data/timelineEdits';

/** The albums of "Our journey" with the admins' changes (kept in its own file: the album list only loads with the timeline and the museum) */
export function useTimeline() {
  const { timelineEdits } = useApp();
  return useMemo(() => applyTimelineEdits(TIMELINE, timelineEdits), [timelineEdits]);
}
