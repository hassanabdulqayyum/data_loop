# Exhaustive Metadata Fields for Turn Nodes

_Compiled from **ideation_collab.md**_

## 1. Identity / Lineage
- `id` (UUID) – primary key
- `script_id` – foreign-key to Script root
- `module`
- `day` / `topic`
- `persona`
- `role` – `'user' | 'assistant'`
- `version` (int)
- `parent_version_id` / `parent_node_id`
- `branch_type` – `edit | alternate | what-if | RLHF | insert_intermediate | …`
- `edge_type` – type of relation to parent (`gold | branch | RLHF_pair_child`)
- `gold` (bool) – on canonical path
- `snapshot_hashes` – list of training snapshot IDs that include this node
- `archived_by_dedup` (bool)

## 2. Authorship & Timestamps
- `author_id`
- `author_role` – `editor | reviewer | ai_assist | migration_script`
- `created_at` (ISO-8601)
- `updated_at`
- `last_editor_id`
- `last_editor_ts`
- `locked_by_user_id`
- `lock_acquired_ts`

## 3. Status / Workflow Flags
- `status` – `draft | in_review | needs_review | approved | rejected`
- `open_tasks_count`
- `open_comments_count`
- `checklist_state` (JSON of checklist items)
- `thread_status_badges` (per comment thread)
- `ctx_shift_flag` (bool – downstream context-shift)
- `blocked_reason`
- `is_edge_case_example` (bool)
- `is_archived` (bool)
- `archive_reason`
- `is_frozen_snapshot_member` (bool)

## 4. Content-level Facts
- `content` (markdown)
- `word_count`
- `token_count`
- `char_count`
- `reading_time_ms`
- `blueprint_step_id` (string)
- `is_repeated_step` (bool)
- `duplicate_phrase_flag` (bool)
- `duplication_score` (float)
- `embedding_vector_id`
- `embedding_version`
- `tts_audio_url`
- `tts_generated_at`

## 5. Quality & Evaluation Scores
- `lm_quality_score`
- `blueprint_score`
- `response_guideline_score`
- `grammar_score`
- `tone_consistency_score`
- `diversity_score`
- `semantic_distance_to_siblings`
- `human_ranking_overall`
- `human_ranking_dimensions` (JSON map)
- `lm_ranking_overall`
- `lm_ranking_dimensions` (JSON map)
- `reward_model_score`
- `production_uplift_pct`
- `production_regression_sigma`
- `safety_score`

## 6. Training / Dataset Flags
- `included_in_training` (bool)
- `included_in_eval_set` (bool)
- `dataset_version_ids` (list)
- `rlhf_preference_pair_ids` (list)
- `times_appeared_in_prod` (int)
- `prod_first_seen_at`
- `prod_last_seen_at`

## 7. Observability & Telemetry
- `avg_read_time_ms`
- `avg_user_reply_length_tokens`
- `positive_feedback_rate`
- `negative_feedback_rate`
- `avg_sentiment_score`
- `day_x_retention_delta`
- `last_prod_engagement_ts`

## 8. Security & Compliance
- `pii_masked` (bool)
- `encryption_version`
- `hipaa_sensitive` (bool)
- `gdpr_purge_ts`

## 9. Tags & Free-form
- `tags` (string array)
- `custom_metrics` (key:value map)
- `annotation_flags` (array)
- `commit_summary` (string)
- `commit_message` (rich-text)

## 10. Preference-Pair / RLHF Extras
- `paired_with_node_ids` (array)
- `pair_preference_wins` (int)
- `pair_preference_losses` (int)
- `pair_human_rank_last_updated`

## 11. UI-only (optional persistence later)
- `canvas_position_x`, `canvas_position_y`
- `collapsed_in_timeline` (bool)
- `highlight_color`

---

This list aggregates every field explicitly called out or implied in the backlog, serving as the master checklist for future "must vs optional" decisions. 