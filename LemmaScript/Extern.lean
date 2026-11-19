import Velvet

namespace LemmaScript

/-- Computational witness used by Velvet's choice node. Verification quantifies
    over every satisfying result independently of the witness used to run it. -/
@[instance_reducible] noncomputable def externFinder {α : Type} (p : α → Prop) : Findable p := by
  classical
  exact {
    find := fun _ => if h : ∃ x, p x then some h.choose else none
    find_none := by
      intro h x hx
      simp [show ∃ x, p x from ⟨x, hx⟩] at h
    find_some_p := by
      intro x h
      split at h
      next hex => cases h; exact hex.choose_spec
      next => contradiction
  }

end LemmaScript
