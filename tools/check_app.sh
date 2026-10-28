#!/usr/bin/env bash
# Rebuild in the legacy order, then run regressions against the FINAL artifact.
set -euo pipefail
cd "$(dirname "$0")/.."
python tools/patch_mock_recovery_v524.py
python tools/patch_unified_mock_v525.py
# Historical generators replace whole functions and are incompatible with a
# released v5.22 artifact. Apply them only when upgrading the legacy baseline.
if python -c 'from pathlib import Path; import sys; sys.exit(0 if "mastery-session-policy-v522" in Path("index.html").read_text(encoding="utf-8-sig") else 1)'; then
  echo 'v5.22 artifact: reapply current release integration'
else
  python tools/patch_pass_plan.py
  python tools/patch_convenience.py
  python tools/patch_2026_navigation.py
  python tools/patch_same_day_confirmation.py
  python tools/patch_predictive_mock.py
  python tools/patch_predictive_mock_followup.py
  python tools/patch_predictive_mock_personalization.py
  python tools/patch_predictive_mock_no_duplicates.py
  python tools/patch_predictive_mock_history_fingerprint.py
  python tools/patch_predictive_mock_priority_core.py
  python tools/patch_2026_session3_explanations.py
  python tools/patch_weak_drills.py
  python tools/patch_recovery_recheck.py
  python tools/patch_stable_session_counter.py
  python tools/patch_rotation_mix.py
  python tools/patch_grade_priority.py
  python tools/patch_grade_priority_ratio_v2.py
  python tools/patch_weak_topic_adaptive.py
  python tools/patch_learning_priority.py
  python tools/patch_learning_priority_weak_drill_compat.py
  python tools/patch_review_spacing_v2.py
  python tools/patch_homework_duplicate_guard.py
  python tools/patch_subject_balance.py
  python tools/patch_audit_safety.py
  python tools/patch_learning_integrity.py
  python tools/patch_daily_storage.py
  python tools/patch_daily_cap_checkpoint.py
  python tools/patch_drive_auth.py
  python tools/patch_menu_cleanup.py
  python tools/patch_answer_flow.py
  python tools/patch_mock_subject_order.py
  python tools/patch_balanced_mock.py
  python tools/patch_navi2_recall.py
  python tools/patch_navi2_reviewed.py
  python tools/patch_readiness_algorithms.py
  python tools/patch_record_safety.py
  python tools/patch_learning_audit.py
  python tools/patch_safe_learning_render.py
  python tools/patch_review_spacing_v3.py
  python tools/patch_reported_content_fixes.py
  python tools/patch_mock_result_pager.py
fi
python tools/patch_learning_system_v522.py
python tools/patch_reported_content_fixes.py
python tools/patch_mock_answer_access.py
python tools/patch_mock_submission_safety.py
python tools/patch_past_variant_navigation.py
python tools/patch_keyboard_context.py
python tools/patch_mock_hint.py
python tools/patch_backup_restore_safety.py
python tools/patch_exam_sessions_v530.py
python tools/patch_exam_restore_v532.py
python tools/patch_homework_checkpoint_v533.py
python tools/patch_homework_rotation_v535.py
python tools/patch_exam_start_guard_v535.py
# Older generators add script URLs; stamp the release only after all integration.
python tools/patch_mock_answer_access.py
node tools/test_exam_sessions_v530.js
node tools/test_exam_cleanup_v531.js
node tools/test_exam_deletion_v536.js
node tools/test_exam_restore_v532.js
node tools/test_exam_validation_v533.js
node tools/test_homework_checkpoint_v533.js
node tools/test_homework_rotation_v535.js
node tools/test_exam_start_guard_v535.js
node tools/test_drive_audit_v533.js
node tools/test_drive_exam_journal.js
node tools/test_drive_journal_recovery_v532.js
node tools/test_navi2_reviewed.js
node tools/test_balanced_mock.js
python tools/test_predictive_mock.py
python tools/test_predictive_mock_personalization.py
python tools/test_predictive_mock_no_duplicates.py
python tools/test_predictive_mock_history_fingerprint.py
python tools/test_predictive_mock_priority_core.py
python tools/test_problem_report_modes.py
node tools/test_problem_report_storage.js
node tools/test_problem_report_ui.js
node tools/test_reported_content_fixes.js
node tools/test_reported_lazy_content.js
node tools/test_reported_content_cache.js
node tools/test_equation_glyph_normalizer.js
node tools/test_pdf_footer_cleanup.js
node tools/test_mock_result_pager.js
node tools/test_mock_explanation_controls.js
node tools/test_mock_answer_progress.js --final
node tools/test_mock_submission_safety.js
node tools/test_past_variant_navigation.js
node tools/test_keyboard_context.js
node tools/test_settings_report_access.js
python tools/test_weak_topic_analytics.py
python tools/test_2026_session3_explanations.py
python tools/test_weak_drills.py
python tools/test_recovery_recheck.py
python tools/test_rotation_mix.py
python tools/test_grade_priority.py
python tools/test_review_spacing_v2.py
python tools/audit_english_explanations.py
python tools/test_homework_duplicate_guard.py
python tools/test_subject_balance.py
python tools/test_readiness_algorithms.py
node tools/test_learning_integrity.js
node tools/test_daily_storage.js
python tools/test_daily_cap_checkpoint.py
node tools/test_drive_sync_v2.js
node tools/test_sync_races.js
node tools/test_sync_storage_clocks.js
node tools/test_backup_restore_safety.js
node tools/test_drive_auth.js
node tools/test_analytics_regressions.js
node tools/test_unified_mock_analytics.js
node tools/test_unified_start.js
node tools/test_predictive_render_safety.js
node tools/test_sync_audit_fixes.js
node tools/test_record_safety.js
node tools/test_learning_audit.js --final
node tools/test_safe_learning_render.js --final
python tools/audit_broken_exam_glyphs.py
node tools/audit_formula_questions.js
node tools/audit_pdf_footer_artifacts.js
python tools/check_final_syntax.py
node tools/test_data_identity_v522.js
node tools/test_scheduler_v522.js
node tools/test_mastery_sessions_v522.js --final
node tools/test_mock_sampling_v522.js
node tools/test_metrics_v522.js
node tools/test_drive_recovery_v522.js
node tools/test_drive_state_codec_v522.js
node tools/test_progress_storage_v522.js
