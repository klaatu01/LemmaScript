import «externDraw.def»

prove_correct sumDraws by
  velvet_vcgen [sumDraws] with (expose_names; try finish)
  all_goals first | exact ⟨0, by decide⟩ | grind

prove_correct sameSavedDraw by
  velvet_vcgen [sameSavedDraw] with (expose_names; try finish)
  all_goals try exact ⟨0, trivial⟩
