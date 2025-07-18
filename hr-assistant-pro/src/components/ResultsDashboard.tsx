'use client';
// Force re-evaluation by Vercel

import { useMemo } from 'react';
import { EvaluationResult } from '@/types';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel, // Import for expanded rows
  useReactTable,
  SortingState,
  Row, // Import Row type
  ExpandedState, // Import ExpandedState type
} from '@tanstack/react-table';
import React, { useState, Fragment } from 'react'; // Added Fragment

import { EnhancedJobRequirements } from '@/types';

interface ResultsDashboardProps {
  results: EvaluationResult[];
  jobRequirements: EnhancedJobRequirements;
}

const columnHelper = createColumnHelper<EvaluationResult>();

// Define a new component for the expanded content
const ExpandedRowContent: React.FC<{ result: EvaluationResult, jobRequirements: EnhancedJobRequirements }> = ({ result, jobRequirements }) => {
  const mustHaves = jobRequirements.mustHave || [];
  const niceToHaves = jobRequirements.niceToHave || [];

  return (
    <div className="p-4 bg-gray-50 border-l-4 border-rush-blue-light">
      <h4 className="text-md font-semibold text-rush-blue-dark mb-2">Detailed Breakdown:</h4>
      
      {/* Must-Haves Section */}
      {mustHaves.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-gray-700">Must-Have Requirements:</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            {mustHaves.map((req, idx) => {
              const isMet = result.mustHavesMet || !result.gaps.some(gap => gap.toLowerCase().includes(req.toLowerCase()));
              // A more robust check would involve specific flags from the backend if a must-have is unmet.
              // For now, we infer based on mustHavesMet flag and if the gap mentions the requirement.
              return (
                <li key={`must-${idx}`} className={isMet ? 'text-green-600' : 'text-red-600'}>
                  {req}: <span className="font-semibold">{isMet ? 'Met' : 'Not Met'}</span>
                  {!isMet && result.gaps.find(gap => gap.toLowerCase().includes(req.toLowerCase())) && 
                    <span className="italic"> - {result.gaps.find(gap => gap.toLowerCase().includes(req.toLowerCase()))}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Nice-to-Haves Section */}
      {niceToHaves.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-gray-700">Nice-to-Have Requirements:</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            {niceToHaves.map((req, idx) => {
              const isStrength = result.strengths.some(strength => strength.toLowerCase().includes(req.toLowerCase()));
              const isGap = result.gaps.some(gap => gap.toLowerCase().includes(req.toLowerCase()));
              let status = 'Neutral';
              let statusClass = 'text-gray-600';
              if (isStrength) { status = 'Aligned'; statusClass = 'text-green-600'; }
              if (isGap) { status = 'Gap'; statusClass = 'text-red-600'; }

              return (
                <li key={`nice-${idx}`} className={statusClass}>
                  {req}: <span className="font-semibold">{status}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* General Explanation (already in a column, but could be repeated or enhanced here) */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="font-medium text-gray-700">AI Explanation:</p>
        <p className="text-sm text-gray-600 whitespace-normal">{result.explanation}</p>
      </div>

      {/* Quartile Performance Section */}
      {result.quartileTier && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-700">Quartile Performance:</p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold">{result.quartileTier}</span>
          </p>
          {result.quartileRank && result.totalQualifiedForQuartile && (
            <p className="text-sm text-gray-600">
              Rank within Qualified Pool: <span className="font-semibold">{result.quartileRank} of {result.totalQualifiedForQuartile}</span>
            </p>
          )}
        </div>
      )}

      {result.tier === 'Not Qualified' && result.gaps && result.gaps.length > 0 && (!jobRequirements.mustHave || jobRequirements.mustHave.length === 0 || result.mustHavesMet === false) && (
         <div className="mt-2 pt-2 border-t border-dashed border-red-300">
            <p className="font-semibold text-red-600">Overall Reason for Not Qualified (if not covered by specific must-haves):</p>
            <ul className="list-disc list-inside ml-2 text-red-500">
              {result.gaps.map((gap, index) => (
                <li key={`general-gap-${index}`}>{gap}</li>
              ))}
            </ul>
          </div>
      )}
    </div>
  );
};

const columns = [
  {
    id: 'expander',
    header: () => null,
    cell: ({ row }: { row: Row<EvaluationResult> }) => {
      return row.getCanExpand() ? (
        <button
          {...{ onClick: row.getToggleExpandedHandler(), style: { cursor: 'pointer' } }}
          className="text-rush-blue hover:text-rush-green p-1"
        >
          {row.getIsExpanded() ? '▼' : '►'}
        </button>
      ) : null;
    },
  },
  columnHelper.accessor('candidateName', {
    header: 'Candidate',
  }),
  columnHelper.accessor('scores.overall', {
    header: 'Overall Score',
    cell: info => `${Math.round(info.row.original.scores.overall)}%`, // Assuming scores.overall is 0-100
  }),
  columnHelper.accessor('tier', {
    header: 'Tier',
    cell: info => {
      const originalTier = info.getValue();
      const { quartileTier } = info.row.original;
      const displayValue = quartileTier ? `${originalTier} (${quartileTier})` : originalTier;
      const tierStyle = {
        'Top Tier': 'bg-green-100 text-green-800',
        'Promising': 'bg-blue-100 text-blue-800',
        'Not a Fit': 'bg-red-100 text-red-800',
        'Not Qualified': 'bg-gray-100 text-gray-800',
        'Potential': 'bg-yellow-100 text-yellow-800',
        'Qualified': 'bg-purple-100 text-purple-800',
      }[originalTier] || 'bg-stone-100 text-stone-800';

      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierStyle}`}>{displayValue}</span>;
    },
  }),
  columnHelper.accessor('explanation', {
    header: 'Summary',
    cell: info => {
      const evaluation = info.row.original;
      return (
        <div className="text-sm text-gray-700 max-w-md whitespace-normal">
          <p>{evaluation.explanation}</p>
          {evaluation.tier === 'Not Qualified' && evaluation.gaps && evaluation.gaps.length > 0 && (
            <div className="mt-2 pt-1 border-t border-dashed border-red-300">
              <p className="font-semibold text-red-600">Reason for Not Qualified:</p>
              <ul className="list-disc list-inside ml-2 text-red-500">
                {evaluation.gaps.map((gap, index) => (
                  <li key={index}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    },
  }),
];

export default function ResultsDashboard({ results: initialResults, jobRequirements }: ResultsDashboardProps) {
  const processedResults = useMemo(() => {
    const qualifiedCandidates = initialResults.filter(r => r.mustHavesMet);

    if (qualifiedCandidates.length > 10) {
      // Sort by preferredQualifications score, descending.
      // Assuming preferredQualifications is available, e.g., result.scores.preferredQualifications
      // If not, this sort needs to be adjusted or the data structure updated.
      qualifiedCandidates.sort((a, b) => b.scores.preferredQualifications - a.scores.preferredQualifications);

      const totalQualified = qualifiedCandidates.length;
      const quartileSize = Math.ceil(totalQualified / 4);

      const updatedQualifiedCandidates = qualifiedCandidates.map((candidate, index) => {
        const rank = index + 1;
        let tier = '';
        if (rank <= quartileSize) {
          tier = 'Top Quartile (Top 25%)';
        } else if (rank <= quartileSize * 2) {
          tier = 'Upper-Mid Quartile (25-50%)';
        } else if (rank <= quartileSize * 3) {
          tier = 'Lower-Mid Quartile (50-75%)';
        } else {
          tier = 'Bottom Quartile (Bottom 25%)';
        }
        return {
          ...candidate,
          quartileTier: tier,
          quartileRank: rank,
          totalQualifiedForQuartile: totalQualified,
        };
      });

      // Merge back with non-qualified or if qualified <= 10
      return initialResults.map(originalResult => 
        updatedQualifiedCandidates.find(uq => uq.candidateId === originalResult.candidateId) || originalResult
      );
    }
    return initialResults; // No changes if not enough qualified candidates
  }, [initialResults]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: processedResults, // Use the processed results with quartile info
    // data: results, // This line is now replaced by the one above in the useReactTable hook argument
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(), // Use the imported model
    onExpandedChange: setExpanded as React.Dispatch<React.SetStateAction<ExpandedState>>,
    getRowCanExpand: () => true, // Enable expansion for all rows
    state: {
      sorting,
      expanded,
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map(row => (
            <Fragment key={row.id}>
              <tr className={`hover:bg-gray-50 ${row.getIsExpanded() ? 'bg-gray-50' : ''}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={`px-6 py-4 ${cell.column.id === 'expander' ? 'w-10' : 'whitespace-nowrap'}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr>
                  {/* Important: colSpan should be the number of columns */}
                  <td colSpan={row.getVisibleCells().length}>
                    <ExpandedRowContent result={row.original} jobRequirements={jobRequirements} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
