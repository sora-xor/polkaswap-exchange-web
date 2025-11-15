declare const _default: {
  /**
   * Lookup74: polkadot_runtime_common::claims::pallet::Event<T>
   **/
  PolkadotRuntimeCommonClaimsPalletEvent: {
    _enum: {
      Claimed: {
        who: string;
        ethereumAddress: string;
        amount: string;
      };
    };
  };
  /**
   * Lookup81: polkadot_runtime::ProxyType
   **/
  PolkadotRuntimeProxyType: {
    _enum: string[];
  };
  /**
   * Lookup99: polkadot_runtime_parachains::inclusion::pallet::Event<T>
   **/
  PolkadotRuntimeParachainsInclusionPalletEvent: {
    _enum: {
      CandidateBacked: string;
      CandidateIncluded: string;
      CandidateTimedOut: string;
    };
  };
  /**
   * Lookup100: polkadot_primitives::v2::CandidateReceipt<primitive_types::H256>
   **/
  PolkadotPrimitivesV2CandidateReceipt: {
    descriptor: string;
    commitmentsHash: string;
  };
  /**
   * Lookup101: polkadot_primitives::v2::CandidateDescriptor<primitive_types::H256>
   **/
  PolkadotPrimitivesV2CandidateDescriptor: {
    paraId: string;
    relayParent: string;
    collator: string;
    persistedValidationDataHash: string;
    povHash: string;
    erasureRoot: string;
    signature: string;
    paraHead: string;
    validationCodeHash: string;
  };
  /**
   * Lookup103: polkadot_primitives::v2::collator_app::Public
   **/
  PolkadotPrimitivesV2CollatorAppPublic: string;
  /**
   * Lookup104: polkadot_primitives::v2::collator_app::Signature
   **/
  PolkadotPrimitivesV2CollatorAppSignature: string;
  /**
   * Lookup111: polkadot_runtime_parachains::paras::pallet::Event
   **/
  PolkadotRuntimeParachainsParasPalletEvent: {
    _enum: {
      CurrentCodeUpdated: string;
      CurrentHeadUpdated: string;
      CodeUpgradeScheduled: string;
      NewHeadNoted: string;
      ActionQueued: string;
      PvfCheckStarted: string;
      PvfCheckAccepted: string;
      PvfCheckRejected: string;
    };
  };
  /**
   * Lookup112: polkadot_runtime_parachains::ump::pallet::Event
   **/
  PolkadotRuntimeParachainsUmpPalletEvent: {
    _enum: {
      InvalidFormat: string;
      UnsupportedVersion: string;
      ExecutedUpward: string;
      WeightExhausted: string;
      UpwardMessagesReceived: string;
      OverweightEnqueued: string;
      OverweightServiced: string;
    };
  };
  /**
   * Lookup113: xcm::v3::traits::Outcome
   **/
  XcmV3TraitsOutcome: {
    _enum: {
      Complete: string;
      Incomplete: string;
      Error: string;
    };
  };
  /**
   * Lookup114: xcm::v3::traits::Error
   **/
  XcmV3TraitsError: {
    _enum: {
      Overflow: string;
      Unimplemented: string;
      UntrustedReserveLocation: string;
      UntrustedTeleportLocation: string;
      LocationFull: string;
      LocationNotInvertible: string;
      BadOrigin: string;
      InvalidLocation: string;
      AssetNotFound: string;
      FailedToTransactAsset: string;
      NotWithdrawable: string;
      LocationCannotHold: string;
      ExceedsMaxMessageSize: string;
      DestinationUnsupported: string;
      Transport: string;
      Unroutable: string;
      UnknownClaim: string;
      FailedToDecode: string;
      MaxWeightInvalid: string;
      NotHoldingFees: string;
      TooExpensive: string;
      Trap: string;
      ExpectationFalse: string;
      PalletNotFound: string;
      NameMismatch: string;
      VersionIncompatible: string;
      HoldingWouldOverflow: string;
      ExportError: string;
      ReanchorFailed: string;
      NoDeal: string;
      FeesNotMet: string;
      LockError: string;
      NoPermission: string;
      Unanchored: string;
      NotDepositable: string;
      UnhandledXcmVersion: string;
      WeightLimitReached: string;
      Barrier: string;
      WeightNotComputable: string;
      ExceedsStackLimit: string;
    };
  };
  /**
   * Lookup115: polkadot_runtime_parachains::hrmp::pallet::Event<T>
   **/
  PolkadotRuntimeParachainsHrmpPalletEvent: {
    _enum: {
      OpenChannelRequested: string;
      OpenChannelCanceled: string;
      OpenChannelAccepted: string;
      ChannelClosed: string;
      HrmpChannelForceOpened: string;
    };
  };
  /**
   * Lookup116: polkadot_parachain::primitives::HrmpChannelId
   **/
  PolkadotParachainPrimitivesHrmpChannelId: {
    sender: string;
    recipient: string;
  };
  /**
   * Lookup117: polkadot_runtime_parachains::disputes::pallet::Event<T>
   **/
  PolkadotRuntimeParachainsDisputesPalletEvent: {
    _enum: {
      DisputeInitiated: string;
      DisputeConcluded: string;
      DisputeTimedOut: string;
      Revert: string;
    };
  };
  /**
   * Lookup119: polkadot_runtime_parachains::disputes::DisputeLocation
   **/
  PolkadotRuntimeParachainsDisputesDisputeLocation: {
    _enum: string[];
  };
  /**
   * Lookup120: polkadot_runtime_parachains::disputes::DisputeResult
   **/
  PolkadotRuntimeParachainsDisputesDisputeResult: {
    _enum: string[];
  };
  /**
   * Lookup121: polkadot_runtime_common::paras_registrar::pallet::Event<T>
   **/
  PolkadotRuntimeCommonParasRegistrarPalletEvent: {
    _enum: {
      Registered: {
        paraId: string;
        manager: string;
      };
      Deregistered: {
        paraId: string;
      };
      Reserved: {
        paraId: string;
        who: string;
      };
    };
  };
  /**
   * Lookup122: polkadot_runtime_common::slots::pallet::Event<T>
   **/
  PolkadotRuntimeCommonSlotsPalletEvent: {
    _enum: {
      NewLeasePeriod: {
        leasePeriod: string;
      };
      Leased: {
        paraId: string;
        leaser: string;
        periodBegin: string;
        periodCount: string;
        extraReserved: string;
        totalAmount: string;
      };
    };
  };
  /**
   * Lookup123: polkadot_runtime_common::auctions::pallet::Event<T>
   **/
  PolkadotRuntimeCommonAuctionsPalletEvent: {
    _enum: {
      AuctionStarted: {
        auctionIndex: string;
        leasePeriod: string;
        ending: string;
      };
      AuctionClosed: {
        auctionIndex: string;
      };
      Reserved: {
        bidder: string;
        extraReserved: string;
        totalAmount: string;
      };
      Unreserved: {
        bidder: string;
        amount: string;
      };
      ReserveConfiscated: {
        paraId: string;
        leaser: string;
        amount: string;
      };
      BidAccepted: {
        bidder: string;
        paraId: string;
        amount: string;
        firstSlot: string;
        lastSlot: string;
      };
      WinningOffset: {
        auctionIndex: string;
        blockNumber: string;
      };
    };
  };
  /**
   * Lookup124: polkadot_runtime_common::crowdloan::pallet::Event<T>
   **/
  PolkadotRuntimeCommonCrowdloanPalletEvent: {
    _enum: {
      Created: {
        paraId: string;
      };
      Contributed: {
        who: string;
        fundIndex: string;
        amount: string;
      };
      Withdrew: {
        who: string;
        fundIndex: string;
        amount: string;
      };
      PartiallyRefunded: {
        paraId: string;
      };
      AllRefunded: {
        paraId: string;
      };
      Dissolved: {
        paraId: string;
      };
      HandleBidResult: {
        paraId: string;
        result: string;
      };
      Edited: {
        paraId: string;
      };
      MemoUpdated: {
        who: string;
        paraId: string;
        memo: string;
      };
      AddedToNewRaise: {
        paraId: string;
      };
    };
  };
  /**
   * Lookup125: pallet_xcm::pallet::Event<T>
   **/
  PalletXcmEvent: {
    _enum: {
      Attempted: string;
      Sent: string;
      UnexpectedResponse: string;
      ResponseReady: string;
      Notified: string;
      NotifyOverweight: string;
      NotifyDispatchError: string;
      NotifyDecodeFailed: string;
      InvalidResponder: string;
      InvalidResponderVersion: string;
      ResponseTaken: string;
      AssetsTrapped: string;
      VersionChangeNotified: string;
      SupportedVersionChanged: string;
      NotifyTargetSendFail: string;
      NotifyTargetMigrationFail: string;
      InvalidQuerierVersion: string;
      InvalidQuerier: string;
      VersionNotifyStarted: string;
      VersionNotifyRequested: string;
      VersionNotifyUnrequested: string;
      FeesPaid: string;
      AssetsClaimed: string;
    };
  };
  /**
   * Lookup126: xcm::v3::multilocation::MultiLocation
   **/
  XcmV3MultiLocation: {
    parents: string;
    interior: string;
  };
  /**
   * Lookup127: xcm::v3::junctions::Junctions
   **/
  XcmV3Junctions: {
    _enum: {
      Here: string;
      X1: string;
      X2: string;
      X3: string;
      X4: string;
      X5: string;
      X6: string;
      X7: string;
      X8: string;
    };
  };
  /**
   * Lookup128: xcm::v3::junction::Junction
   **/
  XcmV3Junction: {
    _enum: {
      Parachain: string;
      AccountId32: {
        network: string;
        id: string;
      };
      AccountIndex64: {
        network: string;
        index: string;
      };
      AccountKey20: {
        network: string;
        key: string;
      };
      PalletInstance: string;
      GeneralIndex: string;
      GeneralKey: {
        length: string;
        data: string;
      };
      OnlyChild: string;
      Plurality: {
        id: string;
        part: string;
      };
      GlobalConsensus: string;
    };
  };
  /**
   * Lookup131: xcm::v3::junction::NetworkId
   **/
  XcmV3JunctionNetworkId: {
    _enum: {
      ByGenesis: string;
      ByFork: {
        blockNumber: string;
        blockHash: string;
      };
      Polkadot: string;
      Kusama: string;
      Westend: string;
      Rococo: string;
      Wococo: string;
      Ethereum: {
        chainId: string;
      };
      BitcoinCore: string;
      BitcoinCash: string;
    };
  };
  /**
   * Lookup132: xcm::v3::junction::BodyId
   **/
  XcmV3JunctionBodyId: {
    _enum: {
      Unit: string;
      Moniker: string;
      Index: string;
      Executive: string;
      Technical: string;
      Legislative: string;
      Judicial: string;
      Defense: string;
      Administration: string;
      Treasury: string;
    };
  };
  /**
   * Lookup133: xcm::v3::junction::BodyPart
   **/
  XcmV3JunctionBodyPart: {
    _enum: {
      Voice: string;
      Members: {
        count: string;
      };
      Fraction: {
        nom: string;
        denom: string;
      };
      AtLeastProportion: {
        nom: string;
        denom: string;
      };
      MoreThanProportion: {
        nom: string;
        denom: string;
      };
    };
  };
  /**
   * Lookup134: xcm::v3::Xcm<Call>
   **/
  XcmV3Xcm: string;
  /**
   * Lookup136: xcm::v3::Instruction<Call>
   **/
  XcmV3Instruction: {
    _enum: {
      WithdrawAsset: string;
      ReserveAssetDeposited: string;
      ReceiveTeleportedAsset: string;
      QueryResponse: {
        queryId: string;
        response: string;
        maxWeight: string;
        querier: string;
      };
      TransferAsset: {
        assets: string;
        beneficiary: string;
      };
      TransferReserveAsset: {
        assets: string;
        dest: string;
        xcm: string;
      };
      Transact: {
        originKind: string;
        requireWeightAtMost: string;
        call: string;
      };
      HrmpNewChannelOpenRequest: {
        sender: string;
        maxMessageSize: string;
        maxCapacity: string;
      };
      HrmpChannelAccepted: {
        recipient: string;
      };
      HrmpChannelClosing: {
        initiator: string;
        sender: string;
        recipient: string;
      };
      ClearOrigin: string;
      DescendOrigin: string;
      ReportError: string;
      DepositAsset: {
        assets: string;
        beneficiary: string;
      };
      DepositReserveAsset: {
        assets: string;
        dest: string;
        xcm: string;
      };
      ExchangeAsset: {
        give: string;
        want: string;
        maximal: string;
      };
      InitiateReserveWithdraw: {
        assets: string;
        reserve: string;
        xcm: string;
      };
      InitiateTeleport: {
        assets: string;
        dest: string;
        xcm: string;
      };
      ReportHolding: {
        responseInfo: string;
        assets: string;
      };
      BuyExecution: {
        fees: string;
        weightLimit: string;
      };
      RefundSurplus: string;
      SetErrorHandler: string;
      SetAppendix: string;
      ClearError: string;
      ClaimAsset: {
        assets: string;
        ticket: string;
      };
      Trap: string;
      SubscribeVersion: {
        queryId: string;
        maxResponseWeight: string;
      };
      UnsubscribeVersion: string;
      BurnAsset: string;
      ExpectAsset: string;
      ExpectOrigin: string;
      ExpectError: string;
      ExpectTransactStatus: string;
      QueryPallet: {
        moduleName: string;
        responseInfo: string;
      };
      ExpectPallet: {
        index: string;
        name: string;
        moduleName: string;
        crateMajor: string;
        minCrateMinor: string;
      };
      ReportTransactStatus: string;
      ClearTransactStatus: string;
      UniversalOrigin: string;
      ExportMessage: {
        network: string;
        destination: string;
        xcm: string;
      };
      LockAsset: {
        asset: string;
        unlocker: string;
      };
      UnlockAsset: {
        asset: string;
        target: string;
      };
      NoteUnlockable: {
        asset: string;
        owner: string;
      };
      RequestUnlock: {
        asset: string;
        locker: string;
      };
      SetFeesMode: {
        jitWithdraw: string;
      };
      SetTopic: string;
      ClearTopic: string;
      AliasOrigin: string;
      UnpaidExecution: {
        weightLimit: string;
        checkOrigin: string;
      };
    };
  };
  /**
   * Lookup137: xcm::v3::multiasset::MultiAssets
   **/
  XcmV3MultiassetMultiAssets: string;
  /**
   * Lookup139: xcm::v3::multiasset::MultiAsset
   **/
  XcmV3MultiAsset: {
    id: string;
    fun: string;
  };
  /**
   * Lookup140: xcm::v3::multiasset::AssetId
   **/
  XcmV3MultiassetAssetId: {
    _enum: {
      Concrete: string;
      Abstract: string;
    };
  };
  /**
   * Lookup141: xcm::v3::multiasset::Fungibility
   **/
  XcmV3MultiassetFungibility: {
    _enum: {
      Fungible: string;
      NonFungible: string;
    };
  };
  /**
   * Lookup142: xcm::v3::multiasset::AssetInstance
   **/
  XcmV3MultiassetAssetInstance: {
    _enum: {
      Undefined: string;
      Index: string;
      Array4: string;
      Array8: string;
      Array16: string;
      Array32: string;
    };
  };
  /**
   * Lookup144: xcm::v3::Response
   **/
  XcmV3Response: {
    _enum: {
      Null: string;
      Assets: string;
      ExecutionResult: string;
      Version: string;
      PalletsInfo: string;
      DispatchResult: string;
    };
  };
  /**
   * Lookup148: xcm::v3::PalletInfo
   **/
  XcmV3PalletInfo: {
    index: string;
    name: string;
    moduleName: string;
    major: string;
    minor: string;
    patch: string;
  };
  /**
   * Lookup151: xcm::v3::MaybeErrorCode
   **/
  XcmV3MaybeErrorCode: {
    _enum: {
      Success: string;
      Error: string;
      TruncatedError: string;
    };
  };
  /**
   * Lookup154: xcm::v2::OriginKind
   **/
  XcmV2OriginKind: {
    _enum: string[];
  };
  /**
   * Lookup155: xcm::double_encoded::DoubleEncoded<T>
   **/
  XcmDoubleEncoded: {
    encoded: string;
  };
  /**
   * Lookup156: xcm::v3::QueryResponseInfo
   **/
  XcmV3QueryResponseInfo: {
    destination: string;
    queryId: string;
    maxWeight: string;
  };
  /**
   * Lookup157: xcm::v3::multiasset::MultiAssetFilter
   **/
  XcmV3MultiassetMultiAssetFilter: {
    _enum: {
      Definite: string;
      Wild: string;
    };
  };
  /**
   * Lookup158: xcm::v3::multiasset::WildMultiAsset
   **/
  XcmV3MultiassetWildMultiAsset: {
    _enum: {
      All: string;
      AllOf: {
        id: string;
        fun: string;
      };
      AllCounted: string;
      AllOfCounted: {
        id: string;
        fun: string;
        count: string;
      };
    };
  };
  /**
   * Lookup159: xcm::v3::multiasset::WildFungibility
   **/
  XcmV3MultiassetWildFungibility: {
    _enum: string[];
  };
  /**
   * Lookup160: xcm::v3::WeightLimit
   **/
  XcmV3WeightLimit: {
    _enum: {
      Unlimited: string;
      Limited: string;
    };
  };
  /**
   * Lookup161: xcm::VersionedMultiAssets
   **/
  XcmVersionedMultiAssets: {
    _enum: {
      V2: string;
      V3: string;
    };
  };
  /**
   * Lookup162: xcm::v2::multiasset::MultiAssets
   **/
  XcmV2MultiassetMultiAssets: string;
  /**
   * Lookup164: xcm::v2::multiasset::MultiAsset
   **/
  XcmV2MultiAsset: {
    id: string;
    fun: string;
  };
  /**
   * Lookup165: xcm::v2::multiasset::AssetId
   **/
  XcmV2MultiassetAssetId: {
    _enum: {
      Concrete: string;
      Abstract: string;
    };
  };
  /**
   * Lookup166: xcm::v2::multilocation::MultiLocation
   **/
  XcmV2MultiLocation: {
    parents: string;
    interior: string;
  };
  /**
   * Lookup167: xcm::v2::multilocation::Junctions
   **/
  XcmV2MultilocationJunctions: {
    _enum: {
      Here: string;
      X1: string;
      X2: string;
      X3: string;
      X4: string;
      X5: string;
      X6: string;
      X7: string;
      X8: string;
    };
  };
  /**
   * Lookup168: xcm::v2::junction::Junction
   **/
  XcmV2Junction: {
    _enum: {
      Parachain: string;
      AccountId32: {
        network: string;
        id: string;
      };
      AccountIndex64: {
        network: string;
        index: string;
      };
      AccountKey20: {
        network: string;
        key: string;
      };
      PalletInstance: string;
      GeneralIndex: string;
      GeneralKey: string;
      OnlyChild: string;
      Plurality: {
        id: string;
        part: string;
      };
    };
  };
  /**
   * Lookup169: xcm::v2::NetworkId
   **/
  XcmV2NetworkId: {
    _enum: {
      Any: string;
      Named: string;
      Polkadot: string;
      Kusama: string;
    };
  };
  /**
   * Lookup171: xcm::v2::BodyId
   **/
  XcmV2BodyId: {
    _enum: {
      Unit: string;
      Named: string;
      Index: string;
      Executive: string;
      Technical: string;
      Legislative: string;
      Judicial: string;
      Defense: string;
      Administration: string;
      Treasury: string;
    };
  };
  /**
   * Lookup172: xcm::v2::BodyPart
   **/
  XcmV2BodyPart: {
    _enum: {
      Voice: string;
      Members: {
        count: string;
      };
      Fraction: {
        nom: string;
        denom: string;
      };
      AtLeastProportion: {
        nom: string;
        denom: string;
      };
      MoreThanProportion: {
        nom: string;
        denom: string;
      };
    };
  };
  /**
   * Lookup173: xcm::v2::multiasset::Fungibility
   **/
  XcmV2MultiassetFungibility: {
    _enum: {
      Fungible: string;
      NonFungible: string;
    };
  };
  /**
   * Lookup174: xcm::v2::multiasset::AssetInstance
   **/
  XcmV2MultiassetAssetInstance: {
    _enum: {
      Undefined: string;
      Index: string;
      Array4: string;
      Array8: string;
      Array16: string;
      Array32: string;
      Blob: string;
    };
  };
  /**
   * Lookup175: xcm::VersionedMultiLocation
   **/
  XcmVersionedMultiLocation: {
    _enum: {
      V2: string;
      V3: string;
    };
  };
  /**
   * Lookup230: polkadot_runtime::SessionKeys
   **/
  PolkadotRuntimeSessionKeys: {
    grandpa: string;
    babe: string;
    imOnline: string;
    paraValidator: string;
    paraAssignment: string;
    authorityDiscovery: string;
  };
  /**
   * Lookup231: polkadot_primitives::v2::validator_app::Public
   **/
  PolkadotPrimitivesV2ValidatorAppPublic: string;
  /**
   * Lookup232: polkadot_primitives::v2::assignment_app::Public
   **/
  PolkadotPrimitivesV2AssignmentAppPublic: string;
  /**
   * Lookup264: polkadot_runtime_common::claims::pallet::Call<T>
   **/
  PolkadotRuntimeCommonClaimsPalletCall: {
    _enum: {
      claim: {
        dest: string;
        ethereumSignature: string;
      };
      mint_claim: {
        who: string;
        value: string;
        vestingSchedule: string;
        statement: string;
      };
      claim_attest: {
        dest: string;
        ethereumSignature: string;
        statement: string;
      };
      attest: {
        statement: string;
      };
      move_claim: {
        _alias: {
          new_: string;
        };
        old: string;
        new_: string;
        maybePreclaim: string;
      };
    };
  };
  /**
   * Lookup265: polkadot_runtime_common::claims::EcdsaSignature
   **/
  PolkadotRuntimeCommonClaimsEcdsaSignature: string;
  /**
   * Lookup270: polkadot_runtime_common::claims::StatementKind
   **/
  PolkadotRuntimeCommonClaimsStatementKind: {
    _enum: string[];
  };
  /**
   * Lookup275: polkadot_runtime::OriginCaller
   **/
  PolkadotRuntimeOriginCaller: {
    _enum: {
      system: string;
      __Unused1: string;
      __Unused2: string;
      __Unused3: string;
      __Unused4: string;
      Void: string;
      __Unused6: string;
      __Unused7: string;
      __Unused8: string;
      __Unused9: string;
      __Unused10: string;
      __Unused11: string;
      __Unused12: string;
      __Unused13: string;
      __Unused14: string;
      Council: string;
      TechnicalCommittee: string;
      __Unused17: string;
      __Unused18: string;
      __Unused19: string;
      __Unused20: string;
      __Unused21: string;
      __Unused22: string;
      __Unused23: string;
      __Unused24: string;
      __Unused25: string;
      __Unused26: string;
      __Unused27: string;
      __Unused28: string;
      __Unused29: string;
      __Unused30: string;
      __Unused31: string;
      __Unused32: string;
      __Unused33: string;
      __Unused34: string;
      __Unused35: string;
      __Unused36: string;
      __Unused37: string;
      __Unused38: string;
      __Unused39: string;
      __Unused40: string;
      __Unused41: string;
      __Unused42: string;
      __Unused43: string;
      __Unused44: string;
      __Unused45: string;
      __Unused46: string;
      __Unused47: string;
      __Unused48: string;
      __Unused49: string;
      ParachainsOrigin: string;
      __Unused51: string;
      __Unused52: string;
      __Unused53: string;
      __Unused54: string;
      __Unused55: string;
      __Unused56: string;
      __Unused57: string;
      __Unused58: string;
      __Unused59: string;
      __Unused60: string;
      __Unused61: string;
      __Unused62: string;
      __Unused63: string;
      __Unused64: string;
      __Unused65: string;
      __Unused66: string;
      __Unused67: string;
      __Unused68: string;
      __Unused69: string;
      __Unused70: string;
      __Unused71: string;
      __Unused72: string;
      __Unused73: string;
      __Unused74: string;
      __Unused75: string;
      __Unused76: string;
      __Unused77: string;
      __Unused78: string;
      __Unused79: string;
      __Unused80: string;
      __Unused81: string;
      __Unused82: string;
      __Unused83: string;
      __Unused84: string;
      __Unused85: string;
      __Unused86: string;
      __Unused87: string;
      __Unused88: string;
      __Unused89: string;
      __Unused90: string;
      __Unused91: string;
      __Unused92: string;
      __Unused93: string;
      __Unused94: string;
      __Unused95: string;
      __Unused96: string;
      __Unused97: string;
      __Unused98: string;
      XcmPallet: string;
    };
  };
  /**
   * Lookup279: polkadot_runtime_parachains::origin::pallet::Origin
   **/
  PolkadotRuntimeParachainsOriginPalletOrigin: {
    _enum: {
      Parachain: string;
    };
  };
  /**
   * Lookup280: pallet_xcm::pallet::Origin
   **/
  PalletXcmOrigin: {
    _enum: {
      Xcm: string;
      Response: string;
    };
  };
  /**
   * Lookup331: polkadot_runtime::NposCompactSolution16
   **/
  PolkadotRuntimeNposCompactSolution16: {
    votes1: string;
    votes2: string;
    votes3: string;
    votes4: string;
    votes5: string;
    votes6: string;
    votes7: string;
    votes8: string;
    votes9: string;
    votes10: string;
    votes11: string;
    votes12: string;
    votes13: string;
    votes14: string;
    votes15: string;
    votes16: string;
  };
  /**
   * Lookup394: polkadot_runtime_parachains::configuration::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsConfigurationPalletCall: {
    _enum: {
      set_validation_upgrade_cooldown: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_validation_upgrade_delay: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_code_retention_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_code_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_pov_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_head_data_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_parathread_cores: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_parathread_retries: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_group_rotation_frequency: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_chain_availability_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_thread_availability_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_scheduling_lookahead: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_validators_per_core: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_validators: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_dispute_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_dispute_post_conclusion_acceptance_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      __Unused16: string;
      set_dispute_conclusion_by_time_out_period: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_no_show_slots: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_n_delay_tranches: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_zeroth_delay_tranche_width: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_needed_approvals: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_relay_vrf_modulo_samples: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_upward_queue_count: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_upward_queue_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_downward_message_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_ump_service_total_weight: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_upward_message_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_max_upward_message_num_per_candidate: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_open_request_ttl: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_sender_deposit: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_recipient_deposit: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_channel_max_capacity: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_channel_max_total_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_max_parachain_inbound_channels: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_max_parathread_inbound_channels: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_channel_max_message_size: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_max_parachain_outbound_channels: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_max_parathread_outbound_channels: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_hrmp_max_message_num_per_candidate: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_ump_max_individual_weight: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_pvf_checking_enabled: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_pvf_voting_ttl: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_minimum_validation_upgrade_delay: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
      set_bypass_consistency_check: {
        _alias: {
          new_: string;
        };
        new_: string;
      };
    };
  };
  /**
   * Lookup395: polkadot_runtime_parachains::shared::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsSharedPalletCall: string;
  /**
   * Lookup396: polkadot_runtime_parachains::inclusion::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsInclusionPalletCall: string;
  /**
   * Lookup397: polkadot_runtime_parachains::paras_inherent::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsParasInherentPalletCall: {
    _enum: {
      enter: {
        data: string;
      };
    };
  };
  /**
   * Lookup398: polkadot_primitives::v2::InherentData<sp_runtime::generic::header::Header<Number, sp_runtime::traits::BlakeTwo256>>
   **/
  PolkadotPrimitivesV2InherentData: {
    bitfields: string;
    backedCandidates: string;
    disputes: string;
    parentHeader: string;
  };
  /**
   * Lookup400: polkadot_primitives::v2::signed::UncheckedSigned<polkadot_primitives::v2::AvailabilityBitfield, polkadot_primitives::v2::AvailabilityBitfield>
   **/
  PolkadotPrimitivesV2SignedUncheckedSigned: {
    payload: string;
    validatorIndex: string;
    signature: string;
  };
  /**
   * Lookup403: bitvec::order::Lsb0
   **/
  BitvecOrderLsb0: string;
  /**
   * Lookup405: polkadot_primitives::v2::validator_app::Signature
   **/
  PolkadotPrimitivesV2ValidatorAppSignature: string;
  /**
   * Lookup407: polkadot_primitives::v2::BackedCandidate<primitive_types::H256>
   **/
  PolkadotPrimitivesV2BackedCandidate: {
    candidate: string;
    validityVotes: string;
    validatorIndices: string;
  };
  /**
   * Lookup408: polkadot_primitives::v2::CommittedCandidateReceipt<primitive_types::H256>
   **/
  PolkadotPrimitivesV2CommittedCandidateReceipt: {
    descriptor: string;
    commitments: string;
  };
  /**
   * Lookup409: polkadot_primitives::v2::CandidateCommitments<N>
   **/
  PolkadotPrimitivesV2CandidateCommitments: {
    upwardMessages: string;
    horizontalMessages: string;
    newValidationCode: string;
    headData: string;
    processedDownwardMessages: string;
    hrmpWatermark: string;
  };
  /**
   * Lookup412: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: string;
    data: string;
  };
  /**
   * Lookup417: polkadot_primitives::v2::ValidityAttestation
   **/
  PolkadotPrimitivesV2ValidityAttestation: {
    _enum: {
      __Unused0: string;
      Implicit: string;
      Explicit: string;
    };
  };
  /**
   * Lookup419: polkadot_primitives::v2::DisputeStatementSet
   **/
  PolkadotPrimitivesV2DisputeStatementSet: {
    candidateHash: string;
    session: string;
    statements: string;
  };
  /**
   * Lookup422: polkadot_primitives::v2::DisputeStatement
   **/
  PolkadotPrimitivesV2DisputeStatement: {
    _enum: {
      Valid: string;
      Invalid: string;
    };
  };
  /**
   * Lookup423: polkadot_primitives::v2::ValidDisputeStatementKind
   **/
  PolkadotPrimitivesV2ValidDisputeStatementKind: {
    _enum: {
      Explicit: string;
      BackingSeconded: string;
      BackingValid: string;
      ApprovalChecking: string;
    };
  };
  /**
   * Lookup424: polkadot_primitives::v2::InvalidDisputeStatementKind
   **/
  PolkadotPrimitivesV2InvalidDisputeStatementKind: {
    _enum: string[];
  };
  /**
   * Lookup425: polkadot_runtime_parachains::paras::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsParasPalletCall: {
    _enum: {
      force_set_current_code: {
        para: string;
        newCode: string;
      };
      force_set_current_head: {
        para: string;
        newHead: string;
      };
      force_schedule_code_upgrade: {
        para: string;
        newCode: string;
        relayParentNumber: string;
      };
      force_note_new_head: {
        para: string;
        newHead: string;
      };
      force_queue_action: {
        para: string;
      };
      add_trusted_validation_code: {
        validationCode: string;
      };
      poke_unused_validation_code: {
        validationCodeHash: string;
      };
      include_pvf_check_statement: {
        stmt: string;
        signature: string;
      };
    };
  };
  /**
   * Lookup426: polkadot_primitives::v2::PvfCheckStatement
   **/
  PolkadotPrimitivesV2PvfCheckStatement: {
    accept: string;
    subject: string;
    sessionIndex: string;
    validatorIndex: string;
  };
  /**
   * Lookup427: polkadot_runtime_parachains::initializer::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsInitializerPalletCall: {
    _enum: {
      force_approve: {
        upTo: string;
      };
    };
  };
  /**
   * Lookup428: polkadot_runtime_parachains::dmp::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsDmpPalletCall: string;
  /**
   * Lookup429: polkadot_runtime_parachains::ump::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsUmpPalletCall: {
    _enum: {
      service_overweight: {
        index: string;
        weightLimit: string;
      };
    };
  };
  /**
   * Lookup430: polkadot_runtime_parachains::hrmp::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsHrmpPalletCall: {
    _enum: {
      hrmp_init_open_channel: {
        recipient: string;
        proposedMaxCapacity: string;
        proposedMaxMessageSize: string;
      };
      hrmp_accept_open_channel: {
        sender: string;
      };
      hrmp_close_channel: {
        channelId: string;
      };
      force_clean_hrmp: {
        para: string;
        inbound: string;
        outbound: string;
      };
      force_process_hrmp_open: {
        channels: string;
      };
      force_process_hrmp_close: {
        channels: string;
      };
      hrmp_cancel_open_request: {
        channelId: string;
        openRequests: string;
      };
      force_open_hrmp_channel: {
        sender: string;
        recipient: string;
        maxCapacity: string;
        maxMessageSize: string;
      };
    };
  };
  /**
   * Lookup431: polkadot_runtime_parachains::disputes::pallet::Call<T>
   **/
  PolkadotRuntimeParachainsDisputesPalletCall: {
    _enum: string[];
  };
  /**
   * Lookup432: polkadot_runtime_common::paras_registrar::pallet::Call<T>
   **/
  PolkadotRuntimeCommonParasRegistrarPalletCall: {
    _enum: {
      register: {
        id: string;
        genesisHead: string;
        validationCode: string;
      };
      force_register: {
        who: string;
        deposit: string;
        id: string;
        genesisHead: string;
        validationCode: string;
      };
      deregister: {
        id: string;
      };
      swap: {
        id: string;
        other: string;
      };
      remove_lock: {
        para: string;
      };
      reserve: string;
      add_lock: {
        para: string;
      };
      schedule_code_upgrade: {
        para: string;
        newCode: string;
      };
      set_current_head: {
        para: string;
        newHead: string;
      };
    };
  };
  /**
   * Lookup433: polkadot_runtime_common::slots::pallet::Call<T>
   **/
  PolkadotRuntimeCommonSlotsPalletCall: {
    _enum: {
      force_lease: {
        para: string;
        leaser: string;
        amount: string;
        periodBegin: string;
        periodCount: string;
      };
      clear_all_leases: {
        para: string;
      };
      trigger_onboard: {
        para: string;
      };
    };
  };
  /**
   * Lookup434: polkadot_runtime_common::auctions::pallet::Call<T>
   **/
  PolkadotRuntimeCommonAuctionsPalletCall: {
    _enum: {
      new_auction: {
        duration: string;
        leasePeriodIndex: string;
      };
      bid: {
        para: string;
        auctionIndex: string;
        firstSlot: string;
        lastSlot: string;
        amount: string;
      };
      cancel_auction: string;
    };
  };
  /**
   * Lookup436: polkadot_runtime_common::crowdloan::pallet::Call<T>
   **/
  PolkadotRuntimeCommonCrowdloanPalletCall: {
    _enum: {
      create: {
        index: string;
        cap: string;
        firstPeriod: string;
        lastPeriod: string;
        end: string;
        verifier: string;
      };
      contribute: {
        index: string;
        value: string;
        signature: string;
      };
      withdraw: {
        who: string;
        index: string;
      };
      refund: {
        index: string;
      };
      dissolve: {
        index: string;
      };
      edit: {
        index: string;
        cap: string;
        firstPeriod: string;
        lastPeriod: string;
        end: string;
        verifier: string;
      };
      add_memo: {
        index: string;
        memo: string;
      };
      poke: {
        index: string;
      };
      contribute_all: {
        index: string;
        signature: string;
      };
    };
  };
  /**
   * Lookup438: sp_runtime::MultiSigner
   **/
  SpRuntimeMultiSigner: {
    _enum: {
      Ed25519: string;
      Sr25519: string;
      Ecdsa: string;
    };
  };
  /**
   * Lookup439: sp_core::ecdsa::Public
   **/
  SpCoreEcdsaPublic: string;
  /**
   * Lookup444: pallet_xcm::pallet::Call<T>
   **/
  PalletXcmCall: {
    _enum: {
      send: {
        dest: string;
        message: string;
      };
      teleport_assets: {
        dest: string;
        beneficiary: string;
        assets: string;
        feeAssetItem: string;
      };
      reserve_transfer_assets: {
        dest: string;
        beneficiary: string;
        assets: string;
        feeAssetItem: string;
      };
      execute: {
        message: string;
        maxWeight: string;
      };
      force_xcm_version: {
        location: string;
        xcmVersion: string;
      };
      force_default_xcm_version: {
        maybeXcmVersion: string;
      };
      force_subscribe_version_notify: {
        location: string;
      };
      force_unsubscribe_version_notify: {
        location: string;
      };
      limited_reserve_transfer_assets: {
        dest: string;
        beneficiary: string;
        assets: string;
        feeAssetItem: string;
        weightLimit: string;
      };
      limited_teleport_assets: {
        dest: string;
        beneficiary: string;
        assets: string;
        feeAssetItem: string;
        weightLimit: string;
      };
    };
  };
  /**
   * Lookup445: xcm::VersionedXcm<RuntimeCall>
   **/
  XcmVersionedXcm: {
    _enum: {
      __Unused0: string;
      __Unused1: string;
      V2: string;
      V3: string;
    };
  };
  /**
   * Lookup446: xcm::v2::Xcm<RuntimeCall>
   **/
  XcmV2Xcm: string;
  /**
   * Lookup448: xcm::v2::Instruction<RuntimeCall>
   **/
  XcmV2Instruction: {
    _enum: {
      WithdrawAsset: string;
      ReserveAssetDeposited: string;
      ReceiveTeleportedAsset: string;
      QueryResponse: {
        queryId: string;
        response: string;
        maxWeight: string;
      };
      TransferAsset: {
        assets: string;
        beneficiary: string;
      };
      TransferReserveAsset: {
        assets: string;
        dest: string;
        xcm: string;
      };
      Transact: {
        originType: string;
        requireWeightAtMost: string;
        call: string;
      };
      HrmpNewChannelOpenRequest: {
        sender: string;
        maxMessageSize: string;
        maxCapacity: string;
      };
      HrmpChannelAccepted: {
        recipient: string;
      };
      HrmpChannelClosing: {
        initiator: string;
        sender: string;
        recipient: string;
      };
      ClearOrigin: string;
      DescendOrigin: string;
      ReportError: {
        queryId: string;
        dest: string;
        maxResponseWeight: string;
      };
      DepositAsset: {
        assets: string;
        maxAssets: string;
        beneficiary: string;
      };
      DepositReserveAsset: {
        assets: string;
        maxAssets: string;
        dest: string;
        xcm: string;
      };
      ExchangeAsset: {
        give: string;
        receive: string;
      };
      InitiateReserveWithdraw: {
        assets: string;
        reserve: string;
        xcm: string;
      };
      InitiateTeleport: {
        assets: string;
        dest: string;
        xcm: string;
      };
      QueryHolding: {
        queryId: string;
        dest: string;
        assets: string;
        maxResponseWeight: string;
      };
      BuyExecution: {
        fees: string;
        weightLimit: string;
      };
      RefundSurplus: string;
      SetErrorHandler: string;
      SetAppendix: string;
      ClearError: string;
      ClaimAsset: {
        assets: string;
        ticket: string;
      };
      Trap: string;
      SubscribeVersion: {
        queryId: string;
        maxResponseWeight: string;
      };
      UnsubscribeVersion: string;
    };
  };
  /**
   * Lookup449: xcm::v2::Response
   **/
  XcmV2Response: {
    _enum: {
      Null: string;
      Assets: string;
      ExecutionResult: string;
      Version: string;
    };
  };
  /**
   * Lookup452: xcm::v2::traits::Error
   **/
  XcmV2TraitsError: {
    _enum: {
      Overflow: string;
      Unimplemented: string;
      UntrustedReserveLocation: string;
      UntrustedTeleportLocation: string;
      MultiLocationFull: string;
      MultiLocationNotInvertible: string;
      BadOrigin: string;
      InvalidLocation: string;
      AssetNotFound: string;
      FailedToTransactAsset: string;
      NotWithdrawable: string;
      LocationCannotHold: string;
      ExceedsMaxMessageSize: string;
      DestinationUnsupported: string;
      Transport: string;
      Unroutable: string;
      UnknownClaim: string;
      FailedToDecode: string;
      MaxWeightInvalid: string;
      NotHoldingFees: string;
      TooExpensive: string;
      Trap: string;
      UnhandledXcmVersion: string;
      WeightLimitReached: string;
      Barrier: string;
      WeightNotComputable: string;
    };
  };
  /**
   * Lookup453: xcm::v2::multiasset::MultiAssetFilter
   **/
  XcmV2MultiassetMultiAssetFilter: {
    _enum: {
      Definite: string;
      Wild: string;
    };
  };
  /**
   * Lookup454: xcm::v2::multiasset::WildMultiAsset
   **/
  XcmV2MultiassetWildMultiAsset: {
    _enum: {
      All: string;
      AllOf: {
        id: string;
        fun: string;
      };
    };
  };
  /**
   * Lookup455: xcm::v2::multiasset::WildFungibility
   **/
  XcmV2MultiassetWildFungibility: {
    _enum: string[];
  };
  /**
   * Lookup456: xcm::v2::WeightLimit
   **/
  XcmV2WeightLimit: {
    _enum: {
      Unlimited: string;
      Limited: string;
    };
  };
  /**
   * Lookup572: polkadot_runtime_common::claims::pallet::Error<T>
   **/
  PolkadotRuntimeCommonClaimsPalletError: {
    _enum: string[];
  };
  /**
   * Lookup647: polkadot_runtime_parachains::configuration::HostConfiguration<BlockNumber>
   **/
  PolkadotRuntimeParachainsConfigurationHostConfiguration: {
    maxCodeSize: string;
    maxHeadDataSize: string;
    maxUpwardQueueCount: string;
    maxUpwardQueueSize: string;
    maxUpwardMessageSize: string;
    maxUpwardMessageNumPerCandidate: string;
    hrmpMaxMessageNumPerCandidate: string;
    validationUpgradeCooldown: string;
    validationUpgradeDelay: string;
    maxPovSize: string;
    maxDownwardMessageSize: string;
    umpServiceTotalWeight: string;
    hrmpMaxParachainOutboundChannels: string;
    hrmpMaxParathreadOutboundChannels: string;
    hrmpSenderDeposit: string;
    hrmpRecipientDeposit: string;
    hrmpChannelMaxCapacity: string;
    hrmpChannelMaxTotalSize: string;
    hrmpMaxParachainInboundChannels: string;
    hrmpMaxParathreadInboundChannels: string;
    hrmpChannelMaxMessageSize: string;
    codeRetentionPeriod: string;
    parathreadCores: string;
    parathreadRetries: string;
    groupRotationFrequency: string;
    chainAvailabilityPeriod: string;
    threadAvailabilityPeriod: string;
    schedulingLookahead: string;
    maxValidatorsPerCore: string;
    maxValidators: string;
    disputePeriod: string;
    disputePostConclusionAcceptancePeriod: string;
    disputeConclusionByTimeOutPeriod: string;
    noShowSlots: string;
    nDelayTranches: string;
    zerothDelayTrancheWidth: string;
    neededApprovals: string;
    relayVrfModuloSamples: string;
    umpMaxIndividualWeight: string;
    pvfCheckingEnabled: string;
    pvfVotingTtl: string;
    minimumValidationUpgradeDelay: string;
  };
  /**
   * Lookup650: polkadot_runtime_parachains::configuration::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsConfigurationPalletError: {
    _enum: string[];
  };
  /**
   * Lookup653: polkadot_runtime_parachains::inclusion::AvailabilityBitfieldRecord<N>
   **/
  PolkadotRuntimeParachainsInclusionAvailabilityBitfieldRecord: {
    bitfield: string;
    submittedAt: string;
  };
  /**
   * Lookup654: polkadot_runtime_parachains::inclusion::CandidatePendingAvailability<primitive_types::H256, N>
   **/
  PolkadotRuntimeParachainsInclusionCandidatePendingAvailability: {
    _alias: {
      hash_: string;
    };
    core: string;
    hash_: string;
    descriptor: string;
    availabilityVotes: string;
    backers: string;
    relayParentNumber: string;
    backedInNumber: string;
    backingGroup: string;
  };
  /**
   * Lookup655: polkadot_runtime_parachains::inclusion::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsInclusionPalletError: {
    _enum: string[];
  };
  /**
   * Lookup656: polkadot_primitives::v2::ScrapedOnChainVotes<primitive_types::H256>
   **/
  PolkadotPrimitivesV2ScrapedOnChainVotes: {
    session: string;
    backingValidatorsPerCandidate: string;
    disputes: string;
  };
  /**
   * Lookup661: polkadot_runtime_parachains::paras_inherent::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsParasInherentPalletError: {
    _enum: string[];
  };
  /**
   * Lookup663: polkadot_runtime_parachains::scheduler::ParathreadClaimQueue
   **/
  PolkadotRuntimeParachainsSchedulerParathreadClaimQueue: {
    queue: string;
    nextCoreOffset: string;
  };
  /**
   * Lookup665: polkadot_runtime_parachains::scheduler::QueuedParathread
   **/
  PolkadotRuntimeParachainsSchedulerQueuedParathread: {
    claim: string;
    coreOffset: string;
  };
  /**
   * Lookup666: polkadot_primitives::v2::ParathreadEntry
   **/
  PolkadotPrimitivesV2ParathreadEntry: {
    claim: string;
    retries: string;
  };
  /**
   * Lookup667: polkadot_primitives::v2::ParathreadClaim
   **/
  PolkadotPrimitivesV2ParathreadClaim: string;
  /**
   * Lookup670: polkadot_primitives::v2::CoreOccupied
   **/
  PolkadotPrimitivesV2CoreOccupied: {
    _enum: {
      Parathread: string;
      Parachain: string;
    };
  };
  /**
   * Lookup673: polkadot_runtime_parachains::scheduler::CoreAssignment
   **/
  PolkadotRuntimeParachainsSchedulerCoreAssignment: {
    core: string;
    paraId: string;
    kind: string;
    groupIdx: string;
  };
  /**
   * Lookup674: polkadot_runtime_parachains::scheduler::AssignmentKind
   **/
  PolkadotRuntimeParachainsSchedulerAssignmentKind: {
    _enum: {
      Parachain: string;
      Parathread: string;
    };
  };
  /**
   * Lookup675: polkadot_runtime_parachains::paras::PvfCheckActiveVoteState<BlockNumber>
   **/
  PolkadotRuntimeParachainsParasPvfCheckActiveVoteState: {
    votesAccept: string;
    votesReject: string;
    age: string;
    createdAt: string;
    causes: string;
  };
  /**
   * Lookup677: polkadot_runtime_parachains::paras::PvfCheckCause<BlockNumber>
   **/
  PolkadotRuntimeParachainsParasPvfCheckCause: {
    _enum: {
      Onboarding: string;
      Upgrade: {
        id: string;
        relayParentNumber: string;
      };
    };
  };
  /**
   * Lookup679: polkadot_runtime_parachains::paras::ParaLifecycle
   **/
  PolkadotRuntimeParachainsParasParaLifecycle: {
    _enum: string[];
  };
  /**
   * Lookup681: polkadot_runtime_parachains::paras::ParaPastCodeMeta<N>
   **/
  PolkadotRuntimeParachainsParasParaPastCodeMeta: {
    upgradeTimes: string;
    lastPruned: string;
  };
  /**
   * Lookup683: polkadot_runtime_parachains::paras::ReplacementTimes<N>
   **/
  PolkadotRuntimeParachainsParasReplacementTimes: {
    expectedAt: string;
    activatedAt: string;
  };
  /**
   * Lookup685: polkadot_primitives::v2::UpgradeGoAhead
   **/
  PolkadotPrimitivesV2UpgradeGoAhead: {
    _enum: string[];
  };
  /**
   * Lookup686: polkadot_primitives::v2::UpgradeRestriction
   **/
  PolkadotPrimitivesV2UpgradeRestriction: {
    _enum: string[];
  };
  /**
   * Lookup687: polkadot_runtime_parachains::paras::ParaGenesisArgs
   **/
  PolkadotRuntimeParachainsParasParaGenesisArgs: {
    genesisHead: string;
    validationCode: string;
    paraKind: string;
  };
  /**
   * Lookup688: polkadot_runtime_parachains::paras::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsParasPalletError: {
    _enum: string[];
  };
  /**
   * Lookup690: polkadot_runtime_parachains::initializer::BufferedSessionChange
   **/
  PolkadotRuntimeParachainsInitializerBufferedSessionChange: {
    validators: string;
    queued: string;
    sessionIndex: string;
  };
  /**
   * Lookup692: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: string;
    msg: string;
  };
  /**
   * Lookup694: polkadot_runtime_parachains::ump::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsUmpPalletError: {
    _enum: string[];
  };
  /**
   * Lookup695: polkadot_runtime_parachains::hrmp::HrmpOpenChannelRequest
   **/
  PolkadotRuntimeParachainsHrmpHrmpOpenChannelRequest: {
    confirmed: string;
    age: string;
    senderDeposit: string;
    maxMessageSize: string;
    maxCapacity: string;
    maxTotalSize: string;
  };
  /**
   * Lookup697: polkadot_runtime_parachains::hrmp::HrmpChannel
   **/
  PolkadotRuntimeParachainsHrmpHrmpChannel: {
    maxCapacity: string;
    maxTotalSize: string;
    maxMessageSize: string;
    msgCount: string;
    totalSize: string;
    mqcHead: string;
    senderDeposit: string;
    recipientDeposit: string;
  };
  /**
   * Lookup699: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: string;
    data: string;
  };
  /**
   * Lookup702: polkadot_runtime_parachains::hrmp::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsHrmpPalletError: {
    _enum: string[];
  };
  /**
   * Lookup704: polkadot_primitives::v2::SessionInfo
   **/
  PolkadotPrimitivesV2SessionInfo: {
    activeValidatorIndices: string;
    randomSeed: string;
    disputePeriod: string;
    validators: string;
    discoveryKeys: string;
    assignmentKeys: string;
    validatorGroups: string;
    nCores: string;
    zerothDelayTrancheWidth: string;
    relayVrfModuloSamples: string;
    nDelayTranches: string;
    noShowSlots: string;
    neededApprovals: string;
  };
  /**
   * Lookup705: polkadot_primitives::v2::IndexedVec<polkadot_primitives::v2::ValidatorIndex, polkadot_primitives::v2::validator_app::Public>
   **/
  PolkadotPrimitivesV2IndexedVecValidatorIndex: string;
  /**
   * Lookup707: polkadot_primitives::v2::IndexedVec<polkadot_primitives::v2::GroupIndex, V>
   **/
  PolkadotPrimitivesV2IndexedVecGroupIndex: string;
  /**
   * Lookup708: polkadot_primitives::vstaging::executor_params::ExecutorParams
   **/
  PolkadotPrimitivesVstagingExecutorParams: string;
  /**
   * Lookup710: polkadot_primitives::vstaging::executor_params::ExecutorParam
   **/
  PolkadotPrimitivesVstagingExecutorParamsExecutorParam: {
    _enum: {
      MaxMemoryPages: string;
      StackLogicalMax: string;
      StackNativeMax: string;
      PrecheckingMaxMemory: string;
    };
  };
  /**
   * Lookup712: polkadot_primitives::v2::DisputeState<N>
   **/
  PolkadotPrimitivesV2DisputeState: {
    validatorsFor: string;
    validatorsAgainst: string;
    start: string;
    concludedAt: string;
  };
  /**
   * Lookup714: polkadot_runtime_parachains::disputes::pallet::Error<T>
   **/
  PolkadotRuntimeParachainsDisputesPalletError: {
    _enum: string[];
  };
  /**
   * Lookup715: polkadot_runtime_common::paras_registrar::ParaInfo<sp_core::crypto::AccountId32, Balance>
   **/
  PolkadotRuntimeCommonParasRegistrarParaInfo: {
    manager: string;
    deposit: string;
    locked: string;
  };
  /**
   * Lookup716: polkadot_runtime_common::paras_registrar::pallet::Error<T>
   **/
  PolkadotRuntimeCommonParasRegistrarPalletError: {
    _enum: string[];
  };
  /**
   * Lookup718: polkadot_runtime_common::slots::pallet::Error<T>
   **/
  PolkadotRuntimeCommonSlotsPalletError: {
    _enum: string[];
  };
  /**
   * Lookup723: polkadot_runtime_common::auctions::pallet::Error<T>
   **/
  PolkadotRuntimeCommonAuctionsPalletError: {
    _enum: string[];
  };
  /**
   * Lookup724: polkadot_runtime_common::crowdloan::FundInfo<sp_core::crypto::AccountId32, Balance, BlockNumber, LeasePeriod>
   **/
  PolkadotRuntimeCommonCrowdloanFundInfo: {
    depositor: string;
    verifier: string;
    deposit: string;
    raised: string;
    end: string;
    cap: string;
    lastContribution: string;
    firstPeriod: string;
    lastPeriod: string;
    fundIndex: string;
  };
  /**
   * Lookup725: polkadot_runtime_common::crowdloan::LastContribution<BlockNumber>
   **/
  PolkadotRuntimeCommonCrowdloanLastContribution: {
    _enum: {
      Never: string;
      PreEnding: string;
      Ending: string;
    };
  };
  /**
   * Lookup726: polkadot_runtime_common::crowdloan::pallet::Error<T>
   **/
  PolkadotRuntimeCommonCrowdloanPalletError: {
    _enum: string[];
  };
  /**
   * Lookup727: pallet_xcm::pallet::QueryStatus<BlockNumber>
   **/
  PalletXcmQueryStatus: {
    _enum: {
      Pending: {
        responder: string;
        maybeMatchQuerier: string;
        maybeNotify: string;
        timeout: string;
      };
      VersionNotifier: {
        origin: string;
        isActive: string;
      };
      Ready: {
        response: string;
        at: string;
      };
    };
  };
  /**
   * Lookup731: xcm::VersionedResponse
   **/
  XcmVersionedResponse: {
    _enum: {
      V2: string;
      V3: string;
    };
  };
  /**
   * Lookup737: pallet_xcm::pallet::VersionMigrationStage
   **/
  PalletXcmVersionMigrationStage: {
    _enum: {
      MigrateSupportedVersion: string;
      MigrateVersionNotifiers: string;
      NotifyCurrentTargets: string;
      MigrateAndNotifyOldTargets: string;
    };
  };
  /**
   * Lookup740: xcm::VersionedAssetId
   **/
  XcmVersionedAssetId: {
    _enum: {
      V3: string;
    };
  };
  /**
   * Lookup741: pallet_xcm::pallet::RemoteLockedFungibleRecord
   **/
  PalletXcmRemoteLockedFungibleRecord: {
    amount: string;
    owner: string;
    locker: string;
    users: string;
  };
  /**
   * Lookup745: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: string[];
  };
  /**
   * Lookup756: pallet_transaction_payment::ChargeTransactionPayment<T>
   **/
  PalletTransactionPaymentChargeTransactionPayment: string;
  /**
   * Lookup757: polkadot_runtime_common::claims::PrevalidateAttests<T>
   **/
  PolkadotRuntimeCommonClaimsPrevalidateAttests: string;
  /**
   * Lookup758: polkadot_runtime::Runtime
   **/
  PolkadotRuntimeRuntime: string;
};
export default _default;
