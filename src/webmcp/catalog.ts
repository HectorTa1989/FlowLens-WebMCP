export const pageToolCatalog = [
  ['get_workflow_summary', 'Get workflow summary', 'Read the current workflow, validation, selection, and run summary.'],
  ['list_workflow_node_types', 'List node types', 'Read the finite node catalog and safe configuration contracts.'],
  ['add_workflow_node', 'Add workflow node', 'Add a configured node at a bounded canvas position with a version guard.'],
  ['update_workflow_node', 'Update workflow node', 'Update an allowed node configuration field with a version guard.'],
  ['connect_workflow_nodes', 'Connect workflow nodes', 'Create a valid non-duplicate connection with a version guard.'],
  ['validate_workflow', 'Validate workflow', 'Run structural, reachability, configuration, and cycle checks.'],
  ['list_workflow_fixtures', 'List fixtures', 'Read safe fixture metadata without returning complete payloads.'],
  ['run_workflow_simulation', 'Run simulation', 'Run a deterministic fixture and open its trace in the workspace.'],
  ['get_run_summary', 'Get run summary', 'Read a bounded run result, branch path, and step identifiers.'],
  ['compare_workflow_runs', 'Compare workflow runs', 'Compare two runs by branch, outcome, status, and duration.'],
] as const

export const selectionToolCatalog = [
  ['inspect_selected_execution', 'Inspect selected execution', 'Read bounded evidence for the trace range selected by the human.'],
  ['compare_selected_path_to_baseline', 'Compare selected path', 'Compare the selected trace range with the successful baseline run.'],
  ['explain_selected_contract_mismatch', 'Explain selected mismatch', 'Return deterministic field-contract evidence for the selected failure.'],
  ['preview_fix_for_selected_failure', 'Preview selected repair', 'Stage and validate a restricted repair without changing the workflow.'],
] as const

export const approvalToolCatalog = [
  ['apply_approved_workflow_patch', 'Apply approved patch', 'Apply only the current human-approved patch using its single-use token.'],
] as const

export const undoToolCatalog = [
  ['undo_last_workflow_change', 'Undo workflow change', 'Reverse the latest reversible workflow edit with a version guard.'],
] as const
